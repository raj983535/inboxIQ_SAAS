import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    // Fetch user settings
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch Gmail connections (EXCLUDE encrypted_refresh_token)
    const { data: gmailConnections } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, account_email, provider, connection_name, connection_slot, status, last_connected_at, last_error, created_at')
      .eq('user_id', user.id)
      .order('connection_slot', { ascending: true });

    // Fetch Google Drive connection
    const { data: driveConnection } = await supabaseAdmin
      .from('google_drive_connections')
      .select('id, account_email, status, inboxiq_folder_id, reports_folder_id, last_connected_at, last_error, created_at')
      .eq('user_id', user.id)
      .single();

    // Fetch subscription status
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plan_id, plan_name, amount, currency, status, current_period_start, current_period_end')
      .eq('user_id', user.id)
      .single();

    // Fetch recent reports metadata
    const { data: recentReports } = await supabaseAdmin
      .from('reports')
      .select('id, report_date, report_type, status, email_delivery_status, drive_upload_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        gender: user.gender || 'male',
        profession: user.profession || 'professor_teacher',
        country: user.country || 'India',
        role: user.role,
      },
      settings: settings || {
        report_time: '08:00',
        timezone: 'Asia/Kolkata',
        max_gmail_connections: 2,
        onboarding_completed: false,
      },
      gmail_connections: gmailConnections || [],
      drive_connection: driveConnection || null,
      subscription: subscription || {
        status: 'inactive',
        plan_id: user.profession === 'student' ? 'plan_student_pro' : 'plan_faculty_pro',
        amount: user.profession === 'student' ? (user.country === 'India' ? 99 : 4) : (user.country === 'India' ? 499 : 8),
        currency: user.country === 'India' ? 'INR' : 'USD',
      },
      recent_reports: recentReports || [],
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}

/**
 * PATCH handler for user profile edits.
 * Enforces strict server-side lock on 'profession', 'country', and 'gender'.
 */
export async function PATCH(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json();

    // Reject attempt to modify permanent fields
    if (body.profession && body.profession !== user.profession) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Profession is permanent registration data and cannot be modified.', 400);
    }
    if (body.country && body.country !== user.country) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Country is permanent registration data and cannot be modified.', 400);
    }
    if (body.gender && body.gender !== user.gender) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Gender is permanent registration data and cannot be modified.', 400);
    }

    const updates = {};
    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
    if (body.email && typeof body.email === 'string') updates.email = body.email.trim().toLowerCase();
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from('users').update(updates).eq('id', user.id);
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
