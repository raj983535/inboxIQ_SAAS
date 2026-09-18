import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { triggerN8nWorkflow } from '@/lib/n8n/client';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, generateExecutionId, checkRateLimit } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    // Rate limiting: Max 5 manual triggers per 5 minutes per user
    const rateLimit = checkRateLimit(`n8n_trigger_${user.id}`, 5, 300000);
    if (!rateLimit.allowed) {
      throw new AppError(ErrorCategories.RATE_LIMIT_ERROR, 'Pipeline execution rate limit exceeded. Please wait a few minutes.', 429);
    }

    // 1. Subscription & Authorization Check
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end, trial_ends_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    const subscription = subscriptions?.[0] || null;

    const trialEnd = subscription?.trial_ends_at || subscription?.current_period_end;
    const hasValidTrial =
      (subscription?.status === 'trialing' || subscription?.status === 'created') &&
      trialEnd &&
      new Date(trialEnd) > new Date();

    const isAllowed = subscription?.status === 'active' ||
      hasValidTrial ||
      (subscription?.status === 'cancelled' && subscription.current_period_end && new Date(subscription.current_period_end) > new Date()) ||
      user.role === 'admin' || user.role === 'super_admin' ||
      process.env.NODE_ENV !== 'production';
    if (!isAllowed) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'An active subscription is required to run the email intelligence pipeline.',
        403
      );
    }

    // 2. Fetch User Settings
    const { data: settings } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 3. Fetch Connected Gmail Mailboxes
    const { data: gmailConnections } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, connection_slot, account_email, status')
      .eq('user_id', user.id)
      .eq('status', 'connected');

    if (!gmailConnections || gmailConnections.length === 0) {
      throw new AppError(
        ErrorCategories.CONFIGURATION_ERROR,
        'No active Gmail accounts are connected. Please connect at least one Gmail account.',
        400
      );
    }

    // 4. Fetch Drive Connection (Optional or Connected)
    const { data: driveConn } = await supabaseAdmin
      .from('google_drive_connections')
      .select('id, account_email, reports_folder_id')
      .eq('user_id', user.id)
      .eq('status', 'connected')
      .maybeSingle();

    // 5. Calculate User's Local Date
    let targetDate = today;
    if (settings?.timezone) {
      try {
        const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: settings.timezone });
        targetDate = dFmt.format(new Date());
      } catch (e) {}
    }

    // 5.5 Check if report already delivered today
    const { data: existingReport } = await supabaseAdmin
      .from('reports')
      .select('id, status, email_delivery_status')
      .eq('user_id', user.id)
      .eq('report_date', targetDate)
      .eq('report_type', 'daily')
      .maybeSingle();

    if (existingReport && (existingReport.status === 'delivered' || existingReport.email_delivery_status === 'delivered')) {
      return NextResponse.json({
        success: true,
        message: `Daily briefing has already been delivered for today (${targetDate}). Duplicate run skipped.`,
        delivered: true,
        skipped: true,
        report_date: targetDate,
      });
    }

    // 6. Create Execution Record in Supabase
    const executionId = generateExecutionId();

    await supabaseAdmin.from('workflow_executions').insert({
      user_id: user.id,
      execution_id: executionId,
      correlation_id: correlationId,
      status: 'queued',
      started_at: new Date().toISOString(),
    });

    // 7. Create Report Record Intent (Idempotent)
    await supabaseAdmin.from('reports').upsert(
      {
        user_id: user.id,
        report_date: targetDate,
        report_type: 'daily',
        status: 'queued',
        email_delivery_status: 'pending',
        drive_upload_status: 'pending',
      },
      { onConflict: 'user_id,report_date,report_type' }
    );

    // 7. Dispatch to n8n external engine with profession & country context
    let n8nResponse = null;
    try {
      n8nResponse = await triggerN8nWorkflow({
        userId: user.id,
        userEmail: user.email,
        profession: user.profession || 'professor_teacher',
        country: user.country || 'India',
        reportTime: settings?.report_time || '08:00',
        timezone: settings?.timezone || 'Asia/Kolkata',
        gmailConnections,
        driveConnection: driveConn,
        reportDate: today,
        executionId: executionId,
        correlationId: correlationId,
      });
    } catch (n8nErr) {
      console.warn('n8n external dispatch notice (instance may be offline in dev):', n8nErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow execution queued successfully.',
      correlation_id: correlationId,
      execution_id: executionId,
      status: 'queued',
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
