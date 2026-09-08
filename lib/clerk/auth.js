import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AppError, ErrorCategories } from '@/lib/errors';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

/**
 * Mock development user for instant local testing when external Clerk credentials are not yet entered.
 */
const MOCK_DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  clerk_user_id: 'user_mock_dev_faculty_101',
  email: 'prof.sharma@university.edu',
  name: 'Prof. Sharma',
  gender: 'male',
  profession: 'professor_teacher',
  country: 'India',
  role: 'admin',
  status: 'active',
  created_at: new Date().toISOString(),
};

function isAuthorizedAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();
  const adminList = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminList.includes(normalized) || normalized === 'sahilrajppm2022@gmail.com';
}

/**
 * Validates the current Clerk session and returns the verified user from Supabase.
 * In development fallback mode, provides a development tenant record.
 */
export async function getAuthenticatedUser() {
  if (!isLiveClerk) {
    return MOCK_DEV_USER;
  }

  let clerkUserId;
  try {
    clerkUserId = auth().userId;
  } catch (error) {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Unable to validate the current session.', 401);
  }

  if (!clerkUserId) {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Unauthorized: User is not logged in.', 401);
  }

  const { data: existingUser, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (lookupError) {
    throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to load your account.', 500);
  }

  if (existingUser) {
    // Auto-elevate authorized owner/admin account if role is user
    if (existingUser.role !== 'admin' && existingUser.role !== 'super_admin' && isAuthorizedAdminEmail(existingUser.email)) {
      await supabaseAdmin.from('users').update({ role: 'admin' }).eq('id', existingUser.id);
      existingUser.role = 'admin';
    }
    return existingUser;
  }

  // The webhook is eventually consistent, so create the tenant record on the first
  // authenticated request as well. This makes the first post-sign-up redirect reliable.
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!primaryEmail) {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Your Clerk account does not have a verified email address.', 400);
  }

  const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'InboxIQ User';
  const metadata = clerkUser.publicMetadata || {};
  const isAdmin = metadata.role === 'admin' || isAuthorizedAdminEmail(primaryEmail);
  const { data: newUser, error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        clerk_user_id: clerkUserId,
        email: primaryEmail.toLowerCase(),
        name: fullName,
        gender: metadata.gender || 'male',
        profession: metadata.profession || 'professor_teacher',
        country: metadata.country || 'India',
        image_url: clerkUser.imageUrl || null,
        role: isAdmin ? 'admin' : 'user',
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'clerk_user_id' }
    )
    .select()
    .single();

  if (upsertError || !newUser) {
    throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to initialize your account.', 500);
  }

  const { error: settingsError } = await supabaseAdmin.from('user_settings').upsert(
    {
      user_id: newUser.id,
      report_time: '08:00',
      timezone: 'Asia/Kolkata',
      max_gmail_connections: 2,
      onboarding_completed: false,
    },
    { onConflict: 'user_id' }
  );
  if (settingsError) {
    throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to initialize your account settings.', 500);
  }

  return newUser;
}

/**
 * Validates that the requesting Clerk user has an 'admin' or 'super_admin' role.
 */
export async function getAuthenticatedAdmin() {
  const user = await getAuthenticatedUser();
  const isAdmin = user.role === 'admin' || user.role === 'super_admin' || isAuthorizedAdminEmail(user.email);
  if (!isAdmin) {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Forbidden: Admin access required.', 403);
  }
  return user;
}
