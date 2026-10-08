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

    // 0. Auto-reconcile stale zombie executions (> 15 minutes old and still queued or processing)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_category: 'timeout',
          error_message: 'Execution timed out (No webhook response from n8n automation engine within 15 minutes)',
        })
        .in('status', ['queued', 'processing'])
        .lt('started_at', fifteenMinutesAgo);
    } catch (reconcileErr) {
      console.warn('[AdminWorkflows] Stale execution reconciliation note:', reconcileErr.message);
    }

    const { data: workflows, error } = await supabaseAdmin
      .from('workflow_executions')
      .select(`
        id,
        user_id,
        execution_id,
        correlation_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        emails_processed,
        error_category,
        error_message,
        created_at,
        users (email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ success: true, workflows: workflows || [] });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const admin = await getAuthenticatedAdmin();

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || admin.id;

    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, profession, country')
      .eq('id', targetUserId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
    }

    const { data: gmailConns } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, connection_slot, account_email, status')
      .eq('user_id', targetUser.id)
      .eq('status', 'connected');

    const { data: driveConn } = await supabaseAdmin
      .from('google_drive_connections')
      .select('id, account_email, reports_folder_id, status')
      .eq('user_id', targetUser.id)
      .eq('status', 'connected')
      .maybeSingle();

    const executionId = `exec_admin_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // 1. Create or update report record
    await supabaseAdmin.from('reports').upsert(
      {
        user_id: targetUser.id,
        report_date: today,
        report_type: 'daily',
        status: 'queued',
        email_delivery_status: 'pending',
        drive_upload_status: 'pending',
      },
      { onConflict: 'user_id,report_date,report_type' }
    );

    // 2. Create workflow execution record
    const { data: newExec, error: execErr } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        execution_id: executionId,
        user_id: targetUser.id,
        correlation_id: correlationId,
        status: 'queued',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (execErr) throw execErr;

    // 3. Dispatch to n8n
    try {
      const { triggerN8nWorkflow } = await import('@/lib/n8n/client');
      await triggerN8nWorkflow({
        userId: targetUser.id,
        userEmail: targetUser.email,
        profession: targetUser.profession || 'professor_teacher',
        country: targetUser.country || 'India',
        reportTime: '09:00',
        timezone: 'Asia/Kolkata',
        gmailConnections: gmailConns || [],
        driveConnection: driveConn || null,
        reportDate: today,
        executionId: executionId,
        correlationId: correlationId,
      });

      // Update execution status to 'processing'
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'processing' })
        .eq('execution_id', executionId);

      return NextResponse.json({
        success: true,
        message: 'Test workflow dispatched successfully and is processing in n8n engine.',
        execution_id: executionId,
        user_email: targetUser.email,
        n8n_dispatched: true,
      });
    } catch (err) {
      // Record failure immediately in DB so it never hangs as 'queued'
      await Promise.all([
        supabaseAdmin
          .from('workflow_executions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_category: 'n8n_dispatch_failure',
            error_message: err.message || 'Failed to dispatch workflow to n8n engine.',
          })
          .eq('execution_id', executionId),
        supabaseAdmin
          .from('reports')
          .update({
            status: 'failed',
            email_delivery_status: 'failed',
          })
          .eq('user_id', targetUser.id)
          .eq('report_date', today)
          .eq('report_type', 'daily'),
      ]);

      return NextResponse.json({
        success: false,
        error: {
          category: 'N8N_DISPATCH_FAILURE',
          message: `Failed to trigger n8n: ${err.message}`,
        },
        execution_id: executionId,
        user_email: targetUser.email,
        n8n_dispatched: false,
      }, { status: 502 });
    }
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
