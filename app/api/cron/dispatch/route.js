import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { triggerN8nWorkflow } from '@/lib/n8n/client';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, generateExecutionId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * Hourly Cron Dispatcher (Next.js Control Plane Gatekeeper)
 * Runs automatically every hour via Vercel Cron (0 * * * *).
 * Acts as an intelligent guard:
 * 1. Checks Supabase for paid subscribers whose report_time matches the current hour in their local timezone.
 * 2. If 0 users match (e.g. at 2 AM): Terminates immediately. 0 n8n executions consumed!
 * 3. If users match: Dispatches only for those users to n8n Webhook (Node 1).
 */
export async function GET(req) {
  const correlationId = generateCorrelationId();
  const startTime = Date.now();

  try {
    // 1. Security Check: Verify CRON_SECRET if configured on Vercel
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const internalKey = req.headers.get('x-inboxiq-secret');
      if (internalKey !== (process.env.N8N_WEBHOOK_SECRET || 'inboxiq_production_orchestration_secret_key_2026')) {
        throw new AppError(ErrorCategories.AUTH_ERROR, 'Unauthorized cron invocation.', 401);
      }
    }

    // 2. Query active subscriptions
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        user_id,
        status,
        current_period_end,
        users!inner (
          id,
          email,
          name,
          profession,
          country
        )
      `)
      .or('status.eq.active,and(status.eq.cancelled,current_period_end.gt.now())');

    if (subErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to query active subscriptions: ${subErr.message}`, 500);
    }

    const usersToProcess = [];

    if (subs && subs.length > 0) {
      const userIds = subs.map(s => s.user_id);
      const { data: settingsList } = await supabaseAdmin
        .from('user_settings')
        .select('user_id, report_time, timezone')
        .in('user_id', userIds);

      const settingsMap = new Map((settingsList || []).map(s => [s.user_id, s]));

      for (const sub of subs) {
        const user = sub.users;
        const userSetting = settingsMap.get(user.id);
        const reportTime = userSetting?.report_time || '08:00';
        const timezone = userSetting?.timezone || 'Asia/Kolkata';
        const scheduledHour = reportTime.split(':')[0].trim().padStart(2, '0');

        let currentLocalHour = '08';
        try {
          const nowInTz = new Intl.DateTimeFormat('en-GB', {
            hour: '2-digit',
            hour12: false,
            timeZone: timezone,
          }).format(new Date());
          currentLocalHour = nowInTz.padStart(2, '0');
        } catch (tzErr) {
          currentLocalHour = new Date().getUTCHours().toString().padStart(2, '0');
        }

        if (scheduledHour === currentLocalHour) {
          usersToProcess.push({
            user_id: user.id,
            user_email: user.email,
            user_name: user.name,
            profession: user.profession || 'professor_teacher',
            country: user.country || 'India',
            report_time: reportTime,
            timezone: timezone,
          });
        }
      }
    }

    // 3. Intelligent Guard: If 0 users match, terminate immediately without calling n8n!
    if (!usersToProcess || usersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        guard: 'active',
        dispatched: 0,
        n8n_executions_saved: 1,
        message: 'No subscribers scheduled for the current hour window. n8n was not called.',
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Dispatch for each eligible user
    const dispatchResults = [];

    for (const target of usersToProcess) {
      let localDate = new Date().toISOString().split('T')[0];
      try {
        const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: target.timezone });
        localDate = dFmt.format(new Date());
      } catch (e) {
        // fallback
      }

      // Check idempotency: If report already delivered today, skip!
      const { data: existingReport } = await supabaseAdmin
        .from('reports')
        .select('id, status, email_delivery_status')
        .eq('user_id', target.user_id)
        .eq('report_date', localDate)
        .maybeSingle();

      if (existingReport && (existingReport.status === 'delivered' || existingReport.email_delivery_status === 'delivered')) {
        dispatchResults.push({
          user_id: target.user_id,
          user_email: target.user_email,
          status: 'skipped',
          reason: 'Daily report already delivered today',
        });
        continue;
      }

      const { data: gmailConns } = await supabaseAdmin
        .from('gmail_connections')
        .select('id, connection_slot, account_email, status')
        .eq('user_id', target.user_id)
        .eq('status', 'connected');

      const { data: driveConn } = await supabaseAdmin
        .from('google_drive_connections')
        .select('id, account_email, reports_folder_id, status')
        .eq('user_id', target.user_id)
        .eq('status', 'connected')
        .maybeSingle();

      const executionId = generateExecutionId();

      await supabaseAdmin.from('reports').upsert(
        {
          user_id: target.user_id,
          report_date: localDate,
          report_type: 'daily',
          status: 'queued',
          email_delivery_status: 'pending',
          drive_upload_status: 'pending',
        },
        { onConflict: 'user_id,report_date,report_type' }
      );

      await supabaseAdmin.from('workflow_executions').insert({
        execution_id: executionId,
        user_id: target.user_id,
        correlation_id: correlationId,
        status: 'queued',
        started_at: new Date().toISOString(),
      });

      try {
        const n8nRes = await triggerN8nWorkflow({
          userId: target.user_id,
          userEmail: target.user_email,
          profession: target.profession,
          country: target.country,
          reportTime: target.report_time,
          timezone: target.timezone,
          gmailConnections: gmailConns || [],
          driveConnection: driveConn || null,
          reportDate: localDate,
        });

        dispatchResults.push({
          user_id: target.user_id,
          user_email: target.user_email,
          status: 'dispatched',
          execution_id: executionId,
          n8n_response: n8nRes.response,
        });
      } catch (dispatchErr) {
        dispatchResults.push({
          user_id: target.user_id,
          user_email: target.user_email,
          status: 'failed',
          error: dispatchErr.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      guard: 'active',
      total_eligible: usersToProcess.length,
      dispatched: dispatchResults.filter(r => r.status === 'dispatched').length,
      skipped: dispatchResults.filter(r => r.status === 'skipped').length,
      failed: dispatchResults.filter(r => r.status === 'failed').length,
      results: dispatchResults,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
