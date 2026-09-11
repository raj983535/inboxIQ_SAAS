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

    // 3. Dispatch to n8n if credentials are configured
    let n8nDispatched = false;
    let n8nNote = 'Dispatched to n8n webhook';
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
      n8nDispatched = true;
    } catch (err) {
      n8nNote = err.message || 'n8n webhook dispatch skipped';
    }

    return NextResponse.json({
      success: true,
      message: 'Test workflow execution queued successfully',
      execution_id: executionId,
      user_email: targetUser.email,
      n8n_dispatched: n8nDispatched,
      n8n_note: n8nNote,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
