import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const correlationId = generateCorrelationId();
  try {
    await getAuthenticatedAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');

    // Single user detail lookup (parallelized with Promise.all)
    if (userId) {
      const [
        { data: user },
        { data: settings },
        { data: gmailConnections },
        { data: driveConnection },
        { data: subscription },
        { data: recentReports },
        { data: recentWorkflows },
      ] = await Promise.all([
        supabaseAdmin.from('users').select('*').eq('id', userId).maybeSingle(),
        supabaseAdmin.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabaseAdmin
          .from('gmail_connections')
          .select('id, connection_slot, account_email, provider, status, last_connected_at, last_error, created_at')
          .eq('user_id', userId),
        supabaseAdmin
          .from('google_drive_connections')
          .select('id, account_email, status, inboxiq_folder_id, reports_folder_id, last_connected_at, last_error, created_at')
          .eq('user_id', userId)
          .maybeSingle(),
        supabaseAdmin.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
        supabaseAdmin
          .from('reports')
          .select('id, report_date, report_type, status, email_delivery_status, drive_upload_status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('workflow_executions')
          .select('id, execution_id, correlation_id, status, started_at, completed_at, duration_ms, emails_processed, error_category, error_message')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      return NextResponse.json({
        success: true,
        user,
        settings,
        gmail_connections: gmailConnections || [],
        drive_connection: driveConnection || null,
        subscription: subscription || null,
        recent_reports: recentReports || [],
        recent_workflows: recentWorkflows || [],
      });
    }

    // List all users with query filters
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        status,
        created_at,
        user_settings (report_time, timezone, onboarding_completed),
        subscriptions (status, plan_name),
        gmail_connections (id, connection_slot, status),
        google_drive_connections (id, status)
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      users: users || [],
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
