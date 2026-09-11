import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { checkIsAdmin, isAuthorizedAdminEmail } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    // Fetch user settings, connections, subscription, and recent reports in parallel
    const [
      { data: settings },
      { data: gmailConnections },
      { data: driveConnection },
      { data: subscriptions },
      { data: recentReports }
    ] = await Promise.all([
      supabaseAdmin.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseAdmin.from('gmail_connections')
        .select('id, account_email, provider, connection_name, connection_slot, status, last_connected_at, last_error, created_at')
        .eq('user_id', user.id)
        .order('connection_slot', { ascending: true }),
      supabaseAdmin.from('google_drive_connections')
        .select('id, account_email, status, inboxiq_folder_id, reports_folder_id, last_connected_at, last_error, created_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabaseAdmin.from('subscriptions')
        .select('id, plan_id, plan_name, amount, currency, status, current_period_start, current_period_end, trial_started_at, trial_ends_at, trial_claimed, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1),
      supabaseAdmin.from('reports')
        .select('id, report_date, report_type, status, email_delivery_status, drive_upload_status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    let activeSub = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

    // RESILIENCE CHECK: If user has an unexpired trial (trial_ends_at > now), but the status
    // got changed to 'created' because they clicked 'Upgrade to Paid Plan' and then cancelled/closed
    // the Razorpay modal, restore their effective access as 'trialing' both in response and DB!
    if (activeSub && activeSub.status === 'created' && activeSub.trial_ends_at && new Date(activeSub.trial_ends_at) > new Date()) {
      activeSub.status = 'trialing';
      activeSub.current_period_end = activeSub.trial_ends_at;
      // Self-heal the database row in the background
      supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'trialing',
          current_period_end: activeSub.trial_ends_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSub.id)
        .then();
    }

    // If subscription is not active, but user is authorized Admin / Owner (or has paid):
    const isOwnerOrAdmin = checkIsAdmin(user);
    if ((!activeSub || activeSub.status !== 'active') && isOwnerOrAdmin) {
      const nowIso = new Date().toISOString();
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const planId = user.profession === 'student' ? 'plan_student_pro' : 'plan_faculty_pro';
      const planName = user.profession === 'student' ? 'InboxIQ Student' : 'InboxIQ Pro';
      const amount = user.profession === 'student' ? (user.country === 'India' ? 99 : 4) : (user.country === 'India' ? 499 : 8);
      const currency = user.country === 'India' ? 'INR' : 'USD';

      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const subPayload = {
        user_id: user.id,
        plan_id: planId,
        plan_name: planName,
        amount: amount,
        currency: currency,
        status: 'active',
        current_period_start: nowIso,
        current_period_end: periodEnd,
        updated_at: nowIso,
      };

      let dbError = null;
      let dbData = null;

      if (existingSub?.id) {
        const { data: updData, error: updErr } = await supabaseAdmin
          .from('subscriptions')
          .update(subPayload)
          .eq('id', existingSub.id)
          .select();
        dbError = updErr;
        dbData = updData;
      } else {
        const { data: insData, error: insErr } = await supabaseAdmin
          .from('subscriptions')
          .insert(subPayload)
          .select();
        dbError = insErr;
        dbData = insData;
      }

      if (dbError) {
        console.error('Supabase subscriptions write error:', JSON.stringify(dbError));
      }

      activeSub = {
        id: existingSub?.id || dbData?.[0]?.id || 'admin_sub',
        plan_id: planId,
        plan_name: planName,
        amount: amount,
        currency: currency,
        status: 'active',
        current_period_start: nowIso,
        current_period_end: periodEnd,
      };
    }

    const effectiveRole = isOwnerOrAdmin ? 'admin' : (user.role || 'user');

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          gender: user.gender || 'male',
          profession: user.profession || 'professor_teacher',
          country: user.country || 'India',
          role: effectiveRole,
          is_admin: isOwnerOrAdmin,
        },
        settings: settings || {
          report_time: '08:00',
          timezone: 'Asia/Kolkata',
          max_gmail_connections: 2,
          profile_completed: false,
          onboarding_completed: false,
        },
        gmail_connections: gmailConnections || [],
        drive_connection: driveConnection || null,
        subscription: activeSub || {
          status: 'inactive',
          plan_id: user.profession === 'student' ? 'plan_student_pro' : 'plan_faculty_pro',
          amount: user.profession === 'student' ? (user.country === 'India' ? 99 : 4) : (user.country === 'India' ? 499 : 8),
          currency: user.country === 'India' ? 'INR' : 'USD',
          trial_claimed: false,
          trial_started_at: null,
          trial_ends_at: null,
        },
        recent_reports: recentReports || [],
        db_debug: {
          target_supabase_project: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not-set',
          has_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}

/**
 * PATCH handler for user profile edits.
 * Strictly enforces immutability on 'profession', 'country', and 'gender'.
 * Only 'name' and 'email' may be updated.
 */
export async function PATCH(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));

    // Explicit rejection for immutable fields per Section 6 & 12
    if (
      (body.profession && body.profession !== user.profession) ||
      (body.country && body.country !== user.country) ||
      (body.gender && body.gender !== user.gender)
    ) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Modifying immutable registration attributes (gender, profession, country) is strictly forbidden.',
        403
      );
    }

    // Explicitly allowlisted editable fields only
    const updates = {};
    if (body.name && typeof body.name === 'string') {
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 120) {
        throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Name must be between 2 and 120 characters.', 400);
      }
      updates.name = trimmedName;
    }

    if (body.email && typeof body.email === 'string') {
      const trimmedEmail = body.email.trim().toLowerCase();
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailPattern.test(trimmedEmail) || trimmedEmail.length > 150) {
        throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Please provide a valid email address.', 400);
      }
      updates.email = trimmedEmail;
    }

    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length > 1) { // more than just updated_at
      const { error: updateErr } = await supabaseAdmin.from('users').update(updates).eq('id', user.id);
      if (updateErr) {
        throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to update user profile: ' + updateErr.message, 500);
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
