import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { triggerN8nWorkflow } from '@/lib/n8n/client';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, generateExecutionId } from '@/lib/utils';
import { sendTrialExpiredRenewalReminderEmail, sendSubscriptionExpiredRenewalReminderEmail } from '@/lib/email';

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
  const { searchParams } = new URL(req.url);
  const isForce = searchParams.get('force') === 'true';

  try {
    // 1. Security Check: Allow Vercel Cron, CRON_SECRET, or internal key
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const internalKey = req.headers.get('x-inboxiq-secret') || req.headers.get('x-internal-key');
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';

    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
    const isInternalAuthorized = Boolean(
      (webhookSecret && internalKey === webhookSecret) ||
      (internalSecret && internalKey === internalSecret)
    );

    if (!isVercelCron && !isCronAuthorized && !isInternalAuthorized) {
      if (process.env.NODE_ENV === 'production' || cronSecret || webhookSecret) {
        throw new AppError(ErrorCategories.AUTH_ERROR, 'Unauthorized cron invocation.', 401);
      }
    }

    // 1.5 Auto-heal: Transition expired trials and subscriptions in database
    const nowIso = new Date().toISOString();
    try {
      await Promise.all([
        supabaseAdmin
          .from('subscriptions')
          .update({ status: 'trial_ended', updated_at: nowIso })
          .eq('status', 'trialing')
          .or(`trial_ends_at.lte.${nowIso},current_period_end.lte.${nowIso}`),
        supabaseAdmin
          .from('subscriptions')
          .update({ status: 'subscription_ended', updated_at: nowIso })
          .in('status', ['active', 'cancelled', 'past_due', 'expired'])
          .not('current_period_end', 'is', null)
          .lte('current_period_end', nowIso)
          .eq('trial_claimed', false),
      ]);
    } catch (healErr) {
      console.warn('[CronDispatch] Auto-heal subscription transition warning:', healErr.message);
    }

    // 2. Query active, trialing, and ended subscriptions eligible for scheduled evaluation
    const { data: subs, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        user_id,
        status,
        plan_name,
        current_period_end,
        trial_ends_at,
        users!inner (
          id,
          email,
          name,
          profession,
          country,
          status
        )
      `)
      .in('status', ['active', 'trialing', 'trial_ended', 'subscription_ended', 'cancelled']);

    if (subErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to query active subscriptions: ${subErr.message}`, 500);
    }

    const usersToProcess = [];
    const expiredUsersToRemind = [];
    const reportMap = new Map();

    if (subs && subs.length > 0) {
      const allSubUserIds = subs.map(s => s.user_id).filter(Boolean);

      // Fetch user settings and existing reports for the last 2 days (prevents unbounded query)
      const yesterdayISO = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [{ data: settingsList }, { data: allExistingReports }] = await Promise.all([
        supabaseAdmin
          .from('user_settings')
          .select('user_id, report_time, timezone, status')
          .in('user_id', allSubUserIds),
        supabaseAdmin
          .from('reports')
          .select('id, user_id, report_date, report_type, status, email_delivery_status, created_at')
          .in('user_id', allSubUserIds)
          .gte('report_date', yesterdayISO),
      ]);

      const settingsMap = new Map((settingsList || []).map(s => [s.user_id, s]));
      for (const r of allExistingReports || []) {
        reportMap.set(`${r.user_id}_${r.report_date}_${r.report_type || 'daily'}`, r);
        reportMap.set(`${r.user_id}_${r.report_date}`, r);
      }

      for (const sub of subs) {
        const user = sub.users;
        if (!user || !user.id) continue;

        // Account status guard: Skip suspended, banned, or inactive user accounts
        if (user.status && user.status !== 'active') {
          continue;
        }

        const userSetting = settingsMap.get(sub.user_id);

        // Preference status guard: Skip if user explicitly paused or disabled their briefings
        if (userSetting?.status && userSetting.status !== 'active') {
          continue;
        }

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

        // Parse scheduled time (supports HH:mm or HH)
        const timeParts = reportTime.split(':');
        const scheduledHour = parseInt(timeParts[0] || '8', 10);
        const scheduledMinute = parseInt(timeParts[1] || '0', 10);

        const currentTotalMinutes = currentLocalHour * 60 + currentLocalMinute;
        const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;

        // Catch-up Guarantee with Boundary Protection:
        // Only process if current time has reached or passed scheduled time today (unless forced)
        if (!isForce && currentTotalMinutes < scheduledTotalMinutes) {
          continue;
        }

        // Idempotency & In-Flight Protection:
        // Skip if report or reminder already delivered today OR actively processing (queued/processing within last 15 mins)
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

        // Determine if user has an expired trial or expired subscription
        const isExpiredTrial =
          sub.status === 'trial_ended' ||
          (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) <= new Date());
        const isExpiredSub =
          sub.status === 'subscription_ended' ||
          (sub.status === 'cancelled' && sub.current_period_end && new Date(sub.current_period_end) <= new Date());

        if (isExpiredTrial || isExpiredSub) {
          expiredUsersToRemind.push({
            user_id: user.id,
            user_email: user.email,
            user_name: user.name,
            plan_name: sub.plan_name || 'InboxIQ Pro',
            isExpiredTrial,
            report_time: reportTime,
            timezone: timezone,
            local_date: localDate,
          });
          continue;
        }

        // Active subscriber or active trialing user -> Queue for n8n AI briefing
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

    // 2.5 Dispatch daily renewal reminder emails to expired users at their scheduled time
    let remindersDispatched = 0;
    if (expiredUsersToRemind.length > 0) {
      for (const rem of expiredUsersToRemind) {
        try {
          if (rem.isExpiredTrial) {
            await sendTrialExpiredRenewalReminderEmail({
              userId: rem.user_id,
              email: rem.user_email,
              name: rem.user_name,
              planName: rem.plan_name,
              reportTime: rem.report_time,
              timezone: rem.timezone,
            });
          } else {
            await sendSubscriptionExpiredRenewalReminderEmail({
              userId: rem.user_id,
              email: rem.user_email,
              name: rem.user_name,
              planName: rem.plan_name,
              reportTime: rem.report_time,
            });
          }

          // Record in reports table for daily idempotency and admin dashboard visibility
          await supabaseAdmin.from('reports').upsert({
            user_id: rem.user_id,
            report_date: rem.local_date,
            report_type: rem.isExpiredTrial ? 'renewal_reminder_trial' : 'renewal_reminder_subscription',
            status: 'delivered',
            email_delivery_status: 'delivered',
            drive_upload_status: 'skipped',
            executive_summary: rem.isExpiredTrial
              ? `Daily renewal reminder delivered at ${rem.report_time} (Trial Ended).`
              : `Daily renewal reminder delivered at ${rem.report_time} (Subscription Ended).`,
          }, { onConflict: 'user_id, report_date, report_type' });

          remindersDispatched++;
        } catch (remErr) {
          console.error(`[CronDispatch] Failed to send renewal reminder to ${rem.user_email}:`, remErr.message);
        }
      }
    }

    // 3. Intelligent Guard: If 0 users need n8n AI briefings, return early (saving n8n executions!)
    if (!usersToProcess || usersToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        guard: 'active',
        dispatched: 0,
        reminders_dispatched: remindersDispatched,
        n8n_executions_saved: 1,
        message: remindersDispatched > 0
          ? `Dispatched ${remindersDispatched} renewal reminder email(s). 0 AI briefings scheduled at this time.`
          : 'No pending subscribers scheduled for delivery at this time. n8n was not called.',
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
    }

    // 4. High-Scale Bulk Prefetching (Connections for eligible users)
    const scheduledUserIds = usersToProcess.map(u => u.user_id);
    const { data: allGmailConns } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, user_id, connection_slot, account_email, status')
      .in('user_id', scheduledUserIds)
      .eq('status', 'connected');

    // Build O(1) in-memory lookup map for Gmail
    const gmailMap = new Map();
    for (const g of allGmailConns || []) {
      const list = gmailMap.get(g.user_id) || [];
      list.push(g);
      gmailMap.set(g.user_id, list);
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
                drive_upload_status: 'skipped',
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
              driveConnection: null,
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
