import crypto from 'crypto';
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
    // 1. Security Check: Require CRON_SECRET Bearer or authorized secret
    // Note: Do NOT trust raw x-vercel-cron header alone because arbitrary internet callers can spoof it.
    // Strictly enforces CRON_SECRET scope (rejects N8N_WEBHOOK_SECRET or INTERNAL_API_SECRET)
    const { verifyCronAuth } = await import('@/lib/internal-auth');
    verifyCronAuth(req);

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
          .lte('current_period_end', nowIso),
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
      const [{ data: settingsList, error: setErr }, { data: allExistingReports, error: repErr }] = await Promise.all([
        supabaseAdmin
          .from('user_settings')
          .select('user_id, report_time, timezone, status')
          .in('user_id', allSubUserIds),
        supabaseAdmin
          .from('reports')
          .select('id, user_id, report_date, report_type, status, email_delivery_status, created_at, updated_at')
          .in('user_id', allSubUserIds)
          .gte('report_date', yesterdayISO),
      ]);

      if (setErr) console.warn('[CronDispatch] Warning fetching user settings:', setErr.message);
      if (repErr) console.warn('[CronDispatch] Warning fetching existing reports:', repErr.message);

      const settingsMap = new Map((settingsList || []).map(s => [s.user_id, s]));
      for (const r of allExistingReports || []) {
        reportMap.set(`${r.user_id}_${r.report_date}_${r.report_type || 'daily'}`, r);
        reportMap.set(`${r.user_id}_${r.report_date}`, r);
        if (r.status === 'delivered' || r.email_delivery_status === 'delivered') {
          reportMap.set(`${r.user_id}_delivered_${r.report_date}`, true);
        }
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

        // Slot Time-Window Gate:
        // Briefings are scheduled by hour slot (e.g. 08:00, 09:00).
        // Trigger only if scheduler runs within the user's target slot window [-5, +20] minutes.
        // E.g., for 09:00 AM, eligible only between 08:55 AM and 09:20 AM.
        // Prevents running hours later and wasting n8n execution credits.
        // Overridden only when ?force=true is explicitly passed by authorized admin/test trigger.
        if (!isForce && (diffMinutes < -5 || diffMinutes > 20)) {
          continue;
        }

        // Idempotency & In-Flight Protection:
        // Skip if report already delivered today OR actively processing (queued/processing within last 15 mins)
        if (reportMap.get(`${user.id}_delivered_${localDate}`)) {
          continue; // Already delivered today, strictly skip
        }

        const existingReport =
          reportMap.get(`${user.id}_${localDate}_daily`) ||
          reportMap.get(`${user.id}_${localDate}`);
        let isRetryRun = false;
        if (existingReport) {
          if (existingReport.status === 'delivered' || existingReport.email_delivery_status === 'delivered') {
            continue; // Already delivered today, strictly skip
          }
          if (existingReport.status === 'queued' || existingReport.status === 'processing' || existingReport.status === 'sending') {
            // Check if recently queued/processed to prevent duplicate concurrent runs
            const lastActivity = new Date(existingReport.updated_at || existingReport.created_at || 0).getTime();
            const threeMinutesAgo = Date.now() - 3 * 60 * 1000;
            if (lastActivity > threeMinutesAgo) {
              continue; // Actively in-flight within last 3 minutes, skip
            }
            // If older than 3 minutes, stalled or dropped execution. Allow retry.
            isRetryRun = true;
          }
          if (existingReport.status === 'failed') {
            // Automatic Self-Healing Retry for Failed Reports:
            const failedAt = new Date(existingReport.updated_at || existingReport.created_at || 0).getTime();
            const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
            if (failedAt > twoMinutesAgo) {
              continue; // Failed very recently, wait 2 mins before retrying
            }
            // Check retry count from workflow_executions to cap at 4 attempts
            const { count: retryCount } = await supabaseAdmin
              .from('workflow_executions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .gte('started_at', `${localDate}T00:00:00Z`);
            if ((retryCount || 0) >= 4) {
              continue; // Max 4 attempts per day
            }
            isRetryRun = true;
            // Reset report status to queued for retry
            await supabaseAdmin.from('reports').update({
              status: 'queued',
              email_delivery_status: 'pending',
              updated_at: new Date().toISOString(),
            }).eq('user_id', user.id).eq('report_date', localDate).eq('report_type', 'daily');
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

        // Active subscriber or active trialing user -> Queue for AI briefing
        // Force native engine on retries, trialing subscriptions, or cross-hour catch-up runs
        const shouldForceNative = isRetryRun || sub.status !== 'active' || currentLocalHour !== scheduledHour;

        usersToProcess.push({
          user_id: user.id,
          user_email: user.email,
          user_name: user.name,
          profession: user.profession || 'professor_teacher',
          country: user.country || 'India',
          report_time: reportTime,
          timezone: timezone,
          local_date: localDate,
          force_native: shouldForceNative,
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

    // 5. Pre-warm n8n Cloud engine (wakes up hibernating cloud containers before batch webhooks hit)
    let rawN8nBase = (process.env.N8N_BASE_URL || 'https://axiaracompany2.app.n8n.cloud').trim().replace(/\/+$/, '');
    if (rawN8nBase.includes('sahilcompany.app.n8n.cloud') || rawN8nBase === 'https://axiaracompany.app.n8n.cloud') {
      rawN8nBase = 'https://axiaracompany2.app.n8n.cloud';
    }
    let n8nBase = rawN8nBase;
    try {
      n8nBase = new URL(rawN8nBase.startsWith('http') ? rawN8nBase : `https://${rawN8nBase}`).origin;
    } catch {}
    try {
      fetch(n8nBase, { signal: AbortSignal.timeout(4000) }).catch(() => {});
    } catch {
      // ignore
    }

    // 6. Concurrent Chunk Dispatching (Handles 100+ users safely without Vercel timeouts)
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
            console.error(`[CronDispatch] Atomic dispatch lock RPC failed for ${target.user_id}:`, claimErr.message);
            dispatchResults.push({
              status: 'failed',
              reason: `Atomic dispatch lock error: ${claimErr.message}`,
            });
            return;
          }

          if (canDispatch === false) {
            dispatchResults.push({
              status: 'skipped',
              reason: 'Execution already in-flight or delivered for today',
            });
            return;
          }

          // Record in workflow_executions
          const { error: insExecErr } = await supabaseAdmin.from('workflow_executions').insert({
            execution_id: executionId,
            user_id: target.user_id,
            correlation_id: correlationId,
            status: 'queued',
            started_at: new Date().toISOString(),
          });
          if (insExecErr) {
            console.warn('[CronDispatch] Failed to insert initial execution record:', insExecErr.message);
          }

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
              forceNative: Boolean(target.force_native),
            });

            dispatchResults.push({
              status: 'dispatched',
              forced_native: Boolean(target.force_native),
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
              status: 'failed',
              error: dispatchErr.message,
            });
          }
        })
      );
    }

    return NextResponse.json({
      success: true,
      correlation_id: correlationId,
      guard: 'active',
      total_eligible: usersToProcess.length,
      dispatched: dispatchResults.filter((r) => r.status === 'dispatched').length,
      skipped: dispatchResults.filter((r) => r.status === 'skipped').length,
      failed: dispatchResults.filter((r) => r.status === 'failed').length,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
