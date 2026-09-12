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
    // 1. Security Check: Verify CRON_SECRET if configured or internal N8N_WEBHOOK_SECRET
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const internalKey = req.headers.get('x-inboxiq-secret') || req.headers.get('x-internal-key');
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
    const isInternalAuthorized = Boolean(webhookSecret && internalKey === webhookSecret);

    if (!isCronAuthorized && !isInternalAuthorized) {
      if (process.env.NODE_ENV === 'production' || cronSecret || webhookSecret) {
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
        trial_ends_at,
        users!inner (
          id,
          email,
          name,
          profession,
          country
        )
      `)
      .in('status', ['active', 'trialing', 'cancelled']);

    if (subErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to query active subscriptions: ${subErr.message}`, 500);
    }

    const usersToProcess = [];
    const reportMap = new Map();

    if (subs && subs.length > 0) {
      const allSubUserIds = subs.map(s => s.user_id).filter(Boolean);

      // Fetch user settings and existing reports for today
      const [{ data: settingsList }, { data: allExistingReports }] = await Promise.all([
        supabaseAdmin
          .from('user_settings')
          .select('user_id, report_time, timezone')
          .in('user_id', allSubUserIds),
        supabaseAdmin
          .from('reports')
          .select('id, user_id, report_date, status, email_delivery_status, created_at, updated_at')
          .in('user_id', allSubUserIds),
      ]);

      const settingsMap = new Map((settingsList || []).map(s => [s.user_id, s]));
      for (const r of allExistingReports || []) {
        reportMap.set(`${r.user_id}_${r.report_date}`, r);
      }

      for (const sub of subs) {
        // Skip expired trials
        if (sub.status === 'trialing' || sub.status === 'created') {
          const trialEnd = sub.trial_ends_at || sub.current_period_end;
          if (!trialEnd || new Date(trialEnd) <= new Date()) {
            continue;
          }
        }

        // Skip cancelled subscriptions whose paid period has ended
        if (sub.status === 'cancelled') {
          if (!sub.current_period_end || new Date(sub.current_period_end) <= new Date()) {
            continue;
          }
        }

        const user = sub.users;
        if (!user || !user.id) continue;

        const userSetting = settingsMap.get(sub.user_id);
        const reportTime = userSetting?.report_time || '08:00';
        const timezone = userSetting?.timezone || 'Asia/Kolkata';

        // Calculate user's local date and current time
        let localDate = new Date().toISOString().split('T')[0];
        let currentLocalHour = 8;
        let currentLocalMinute = 0;
        try {
          const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
          localDate = dFmt.format(new Date());

          const parts = new Intl.DateTimeFormat('en-GB', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
            timeZone: timezone,
          }).formatToParts(new Date());

          currentLocalHour = parseInt(parts.find(p => p.type === 'hour')?.value || '8', 10);
          currentLocalMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
        } catch (tzErr) {
          const nowUtc = new Date();
          currentLocalHour = nowUtc.getUTCHours();
          currentLocalMinute = nowUtc.getUTCMinutes();
        }

        // Idempotency & In-Flight Protection:
        // Skip if report already delivered today OR actively processing (queued/processing within last 15 mins)
        const existingReport = reportMap.get(`${user.id}_${localDate}`);
        if (existingReport) {
          if (existingReport.status === 'delivered' || existingReport.email_delivery_status === 'delivered') {
            continue; // Already delivered today, skip
          }
          if (existingReport.status === 'queued' || existingReport.status === 'processing') {
            // Check if recently queued/processed to prevent duplicate concurrent runs
            const lastActivity = new Date(existingReport.updated_at || existingReport.created_at || 0).getTime();
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            if (lastActivity > fifteenMinutesAgo) {
              continue; // Actively in-flight within last 15 minutes, skip
            }
            // If older than 15 minutes, it is a stale zombie lock from a crashed run. Allow catchup retry!
          }
        }

        // Parse scheduled time (supports HH:mm or HH)
        const timeParts = reportTime.split(':');
        const scheduledHour = parseInt(timeParts[0] || '8', 10);
        const scheduledMinute = parseInt(timeParts[1] || '0', 10);

        const currentTotalMinutes = currentLocalHour * 60 + currentLocalMinute;
        const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;

        // Catch-up Guarantee with Boundary Protection:
        // 1. Current time must be >= scheduled time
        // 2. Only dispatch if the user has NOT already received today's report
        if (currentTotalMinutes >= scheduledTotalMinutes) {
          usersToProcess.push({
            user_id: user.id,
            user_email: user.email,
            user_name: user.name,
            profession: user.profession || 'professor_teacher',
            country: user.country || 'India',
            report_time: reportTime,
            timezone: timezone,
            local_date: localDate,
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
        message: 'No pending subscribers scheduled for delivery at this time. n8n was not called.',
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. High-Scale Bulk Prefetching (Connections for eligible users)
    const scheduledUserIds = usersToProcess.map((u) => u.user_id);

    const [{ data: allGmailConns }, { data: allDriveConns }] = await Promise.all([
      supabaseAdmin
        .from('gmail_connections')
        .select('id, user_id, connection_slot, account_email, status')
        .in('user_id', scheduledUserIds)
        .eq('status', 'connected'),
      supabaseAdmin
        .from('google_drive_connections')
        .select('id, user_id, account_email, reports_folder_id, status')
        .in('user_id', scheduledUserIds)
        .eq('status', 'connected'),
    ]);

    // Build O(1) in-memory lookup maps
    const gmailMap = new Map();
    for (const g of allGmailConns || []) {
      const list = gmailMap.get(g.user_id) || [];
      list.push(g);
      gmailMap.set(g.user_id, list);
    }

    const driveMap = new Map();
    for (const d of allDriveConns || []) {
      driveMap.set(d.user_id, d);
    }

    // 5. Concurrent Chunk Dispatching (Handles 100+ users safely without Vercel timeouts)
    const dispatchResults = [];
    const CHUNK_SIZE = 10; // 10 parallel dispatches per chunk

    for (let i = 0; i < usersToProcess.length; i += CHUNK_SIZE) {
      const batch = usersToProcess.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        batch.map(async (target) => {
          let localDate = new Date().toISOString().split('T')[0];
          try {
            const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: target.timezone });
            localDate = dFmt.format(new Date());
          } catch (e) {
            // fallback to UTC
          }

          // Idempotency check via in-memory map
          const existingReport = reportMap.get(`${target.user_id}_${localDate}`);
          if (existingReport && (existingReport.status === 'delivered' || existingReport.email_delivery_status === 'delivered')) {
            dispatchResults.push({
              user_id: target.user_id,
              user_email: target.user_email,
              status: 'skipped',
              reason: 'Daily report already delivered today',
            });
            return;
          }
          if (existingReport && (existingReport.status === 'queued' || existingReport.status === 'processing')) {
            const lastActivity = new Date(existingReport.updated_at || existingReport.created_at || 0).getTime();
            const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
            if (lastActivity > fifteenMinutesAgo) {
              dispatchResults.push({
                user_id: target.user_id,
                user_email: target.user_email,
                status: 'skipped',
                reason: 'Execution actively in-flight within last 15 minutes',
              });
              return;
            }
          }

          const userGmailConns = gmailMap.get(target.user_id) || [];
          if (!userGmailConns || userGmailConns.length === 0) {
            dispatchResults.push({
              user_id: target.user_id,
              user_email: target.user_email,
              status: 'skipped',
              reason: 'No connected Gmail account found for user',
            });
            return;
          }

          const userDriveConn = driveMap.get(target.user_id) || null;
          const executionId = generateExecutionId();

          // Prepare database state for execution
          await Promise.all([
            supabaseAdmin.from('reports').upsert(
              {
                user_id: target.user_id,
                report_date: localDate,
                report_type: 'daily',
                status: 'queued',
                email_delivery_status: 'pending',
                drive_upload_status: 'pending',
              },
              { onConflict: 'user_id,report_date,report_type' }
            ),
            supabaseAdmin.from('workflow_executions').insert({
              execution_id: executionId,
              user_id: target.user_id,
              correlation_id: correlationId,
              status: 'queued',
              started_at: new Date().toISOString(),
            }),
          ]);

          try {
            const n8nRes = await triggerN8nWorkflow({
              userId: target.user_id,
              userEmail: target.user_email,
              profession: target.profession,
              country: target.country,
              reportTime: target.report_time,
              timezone: target.timezone,
              gmailConnections: userGmailConns,
              driveConnection: userDriveConn,
              reportDate: localDate,
              executionId: executionId,
              correlationId: correlationId,
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
        })
      );
    }

    return NextResponse.json({
      success: true,
      guard: 'active',
      total_eligible: usersToProcess.length,
      dispatched: dispatchResults.filter((r) => r.status === 'dispatched').length,
      skipped: dispatchResults.filter((r) => r.status === 'skipped').length,
      failed: dispatchResults.filter((r) => r.status === 'failed').length,
      results: dispatchResults,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
