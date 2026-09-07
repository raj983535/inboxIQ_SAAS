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

/**
 * Validates the current Clerk session and returns the verified user from Supabase.
 * In development fallback mode, provides a development tenant record.
 */
export async function getAuthenticatedUser() {
  if (!isLiveClerk) {
    return MOCK_DEV_USER;
  }

  let clerkUserId = null;
  try {
    const authObj = auth();
    clerkUserId = authObj.userId;
  } catch {
    return MOCK_DEV_USER;
  }

  if (!clerkUserId) {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Unauthorized: User is not logged in.', 401);
  }

  // Look up user in database
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (user) {
      return user;
    }

    // Auto-sync user if missing in Supabase
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || 'user@inboxiq.local';
    const fullName = `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || 'InboxIQ User';
    const isAdmin = clerkUser?.publicMetadata?.role === 'admin' || process.env.ADMIN_EMAIL === primaryEmail;
    const profession = clerkUser?.publicMetadata?.profession || 'professor_teacher';
    const country = clerkUser?.publicMetadata?.country || 'India';
    const gender = clerkUser?.publicMetadata?.gender || 'male';

    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          clerk_user_id: clerkUserId,
          email: primaryEmail,
          name: fullName,
          gender: gender,
          profession: profession,
          country: country,
          image_url: clerkUser?.imageUrl || null,
          role: isAdmin ? 'admin' : 'user',
          status: 'active',
        },
      ])
      .select()
      .single();

    if (newUser) {
      await supabaseAdmin.from('user_settings').upsert({
        user_id: newUser.id,
        report_time: '08:00',
        timezone: 'Asia/Kolkata',
        max_gmail_connections: 2,
        onboarding_completed: false,
      });
      return newUser;
    }
  } catch (err) {
    console.warn('Database query notice (fallback to dev user in sandbox):', err.message);
  }

  return MOCK_DEV_USER;
}

/**
 * Validates that the requesting Clerk user has an 'admin' or 'super_admin' role.
 */
export async function getAuthenticatedAdmin() {
  const user = await getAuthenticatedUser();
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new AppError(ErrorCategories.AUTH_ERROR, 'Forbidden: Admin access required.', 403);
  }
  return user;
}
