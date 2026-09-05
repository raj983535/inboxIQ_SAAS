import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    await getAuthenticatedAdmin();

    // 1. User stats
    const { count: totalUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true });
    const { count: activeUsers } = await supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active');

    // 2. Subscription stats
    const { count: activeSubscriptions } = await supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: inactiveSubscriptions } = await supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).neq('status', 'active');

    // 3. Connection stats
    const { count: totalGmailConnections } = await supabaseAdmin.from('gmail_connections').select('*', { count: 'exact', head: true }).eq('status', 'connected');
    const { count: totalDriveConnections } = await supabaseAdmin.from('google_drive_connections').select('*', { count: 'exact', head: true }).eq('status', 'connected');

    // 4. Report stats
    const { count: reportsDelivered } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('email_delivery_status', 'delivered');
    const { count: reportsArchived } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('drive_upload_status', 'uploaded');
    const { count: reportsFailed } = await supabaseAdmin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'failed');

    // 5. Workflow stats
    const { count: workflowFailed } = await supabaseAdmin.from('workflow_executions').select('*', { count: 'exact', head: true }).eq('status', 'failed');
    const { count: workflowProcessing } = await supabaseAdmin.from('workflow_executions').select('*', { count: 'exact', head: true }).eq('status', 'processing');

    // 6. Total errors
    const { count: unresolvedErrors } = await supabaseAdmin.from('system_errors').select('*', { count: 'exact', head: true }).eq('error_status', 'unresolved');

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        inactiveSubscriptions: inactiveSubscriptions || 0,
        totalGmailConnections: totalGmailConnections || 0,
        totalDriveConnections: totalDriveConnections || 0,
        reportsDelivered: reportsDelivered || 0,
        reportsArchived: reportsArchived || 0,
        reportsFailed: reportsFailed || 0,
        workflowFailed: workflowFailed || 0,
        workflowProcessing: workflowProcessing || 0,
        unresolvedErrors: unresolvedErrors || 0,
      },
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
