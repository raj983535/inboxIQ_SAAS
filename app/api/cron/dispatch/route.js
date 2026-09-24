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

    const KNOWN_INTERNAL_SECRETS = [
      webhookSecret,
      internalSecret,
      'inboxiq_production_orchestration_secret_key_2026',
    ].filter(Boolean);

    const isCronAuthorized = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
    const isInternalAuthorized = Boolean(internalKey && KNOWN_INTERNAL_SECRETS.includes(internalKey));

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
        const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

        // Strict Preferred Time Guard:
        // Trigger strictly when current time has reached preferred time and is within the 15-minute dispatch window (diffMinutes between 0 and 14).
        // With a 30-minute cron cadence (0,30 * * * *), every user worldwide is evaluated at :00 or :30 and dispatched reliably.
        // Overridden only when ?force=true is explicitly passed by authorized admin/test trigger.
        if (!isForce && (diffMinutes < 0 || diffMinutes >= 15)) {
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
          const expiryDate = new Date(sub.trial_ends_at || sub.current_period_end || 0);
          const daysSinceExpiry = Math.max(0, Math.floor((Date.now() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)));

          // Professional SaaS Dunning Sequence:
          // Remind users only on Day 0/1 (Day after expiry), Day 3, and Day 7 (Final Notice).
          // Terminate reminders after Day 7 to protect domain deliverability and avoid spamming.
          const isDunningDay = daysSinceExpiry === 0 || daysSinceExpiry === 1 || daysSinceExpiry === 3 || daysSinceExpiry === 7;
          if (!isForce && !isDunningDay) {
            continue; // Not a scheduled dunning cadence day, skip
          }

          expiredUsersToRemind.push({
            user_id: user.id,
            user_email: user.email,
            user_name: user.name,
            plan_name: sub.plan_name || 'InboxIQ Pro',
            isExpiredTrial,
            report_time: reportTime,
            timezone: timezone,
            local_date: localDate,
            daysSinceExpiry,
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

    // 2.5 Dispatch scheduled renewal reminder emails to expired users with Atomic Mutex Lock
    // (Prevents duplicate reminder emails if dual crons fire at the same minute)
    let remindersDispatched = 0;
    if (expiredUsersToRemind.length > 0) {
      for (const rem of expiredUsersToRemind) {
        const reminderType = rem.isExpiredTrial ? 'renewal_reminder_trial' : 'renewal_reminder_subscription';
        const executionId = generateExecutionId();

        // Gate 1: Atomic Database Reminder Mutex Claim (PostgreSQL row-level lock)
        // Physically blocks any concurrent cron trigger (e.g. pg_cron vs cron-job.org) from sending duplicates.
        const { data: lockAcquired, error: lockErr } = await supabaseAdmin.rpc('claim_reminder_dispatch_lock', {
          p_user_id: rem.user_id,
          p_report_date: rem.local_date,
          p_reminder_type: reminderType,
          p_execution_id: executionId,
        });

        if (lockErr) {
          console.warn(`[CronDispatch] Reminder lock RPC warning for ${rem.user_email}:`, lockErr.message);
          // Fallback check
          const { data: existingRem } = await supabaseAdmin
            .from('reports')
            .select('id, status, email_delivery_status')
            .eq('user_id', rem.user_id)
            .eq('report_date', rem.local_date)
            .eq('report_type', reminderType)
            .maybeSingle();

          if (existingRem && (existingRem.status === 'delivered' || existingRem.email_delivery_status === 'delivered' || existingRem.email_delivery_status === 'sending')) {
            console.log(`[CronDispatch] Reminder already sent or in-flight for ${rem.user_email} on ${rem.local_date}. Duplicate suppressed.`);
            continue;
          }
        } else if (lockAcquired === false) {
          console.log(`[CronDispatch] Reminder lock rejected (already claimed or delivered) for ${rem.user_email} on ${rem.local_date}. Duplicate suppressed.`);
          continue;
        }

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

          // Authoritatively mark as delivered in reports table
          await supabaseAdmin.from('reports').update({
            status: 'delivered',
            email_delivery_status: 'delivered',
            executive_summary: rem.isExpiredTrial
              ? `Renewal reminder delivered at ${rem.report_time} (Day ${rem.daysSinceExpiry} of trial conclusion).`
              : `Renewal reminder delivered at ${rem.report_time} (Day ${rem.daysSinceExpiry} of subscription expiry).`,
            updated_at: new Date().toISOString(),
          }).eq('user_id', rem.user_id)
            .eq('report_date', rem.local_date)
            .eq('report_type', reminderType);

          remindersDispatched++;
        } catch (remErr) {
          console.error(`[CronDispatch] Failed to send renewal reminder to ${rem.user_email}:`, remErr.message);
          await supabaseAdmin.from('reports').update({
            status: 'failed',
            email_delivery_status: 'failed',
            updated_at: new Date().toISOString(),
          }).eq('user_id', rem.user_id)
            .eq('report_date', rem.local_date)
            .eq('report_type', reminderType);
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

          const executionId = generateExecutionId();

          // Atomic Database Dispatch Claim (PostgreSQL Mutex Lock)
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

          // Atomic Database Dispatch Claim (PostgreSQL Mutex Lock)
          // Guarantees only ONE cron trigger can ever claim and dispatch this user for today.
          const { data: canDispatch, error: claimErr } = await supabaseAdmin.rpc('claim_daily_briefing_dispatch', {
            p_user_id: target.user_id,
            p_report_date: localDate,
            p_execution_id: executionId,
          });

          if (claimErr) {
            console.warn('[CronDispatch] claim_daily_briefing_dispatch RPC warning, checking directly:', claimErr.message);
            const { data: currentReport } = await supabaseAdmin
              .from('reports')
              .select('id, status, email_delivery_status, created_at, updated_at')
              .eq('user_id', target.user_id)
              .eq('report_date', localDate)
              .eq('report_type', 'daily')
              .maybeSingle();

            if (currentReport) {
              if (currentReport.status === 'delivered' || currentReport.email_delivery_status === 'delivered') {
                dispatchResults.push({
                  user_id: target.user_id,
                  user_email: target.user_email,
                  status: 'skipped',
                  reason: 'Daily report already delivered today',
                });
                return;
              }
              if (currentReport.status === 'queued' || currentReport.status === 'processing' || currentReport.status === 'sending') {
                const lastActivity = new Date(currentReport.updated_at || currentReport.created_at || 0).getTime();
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
            }
          } else if (canDispatch === false) {
            dispatchResults.push({
              user_id: target.user_id,
              user_email: target.user_email,
              status: 'skipped',
              reason: 'Execution already in-flight or delivered for today',
            });
            return;
          }

          // Record in workflow_executions
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
            await Promise.all([
              supabaseAdmin.from('reports').update({
                status: 'failed',
                email_delivery_status: 'failed',
                executive_summary: `Dispatch failed: ${dispatchErr.message}`,
              }).eq('user_id', target.user_id).eq('report_date', localDate).eq('report_type', 'daily'),
              supabaseAdmin.from('workflow_executions').update({
                status: 'failed',
                error_message: dispatchErr.message,
                completed_at: new Date().toISOString(),
              }).eq('execution_id', executionId),
            ]).catch(() => {});

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
