import { NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';
import {
  sendRenewalConfirmationEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionExpiredEmail,
} from '@/lib/email';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    // 1. Must read raw body as text for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Missing Razorpay signature header.', 400);
    }

    // 2. Verify webhook signature strictly
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Invalid Razorpay webhook signature.', 401);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed webhook JSON payload.', 400);
    }
    const event = payload.event;
    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity || {};

    const subscriptionId = entity.subscription_id || entity.id;
    const userId = entity.notes?.userId;
    const userEmail = entity.notes?.userEmail || entity.email;

    const crypto = await import('crypto');
    const providerEventId =
      payload.event_id ||
      req.headers.get('x-razorpay-event-id') ||
      entity.id ||
      crypto.createHash('sha256').update(rawBody).digest('hex');

    // 2.5 Atomic Idempotency Claim on payment_events
    const { data: claimedEvent, error: claimErr } = await supabaseAdmin
      .from('payment_events')
      .insert({
        provider: 'razorpay',
        provider_event_id: providerEventId,
        event_type: event || 'unknown',
        status: 'processing',
        received_at: new Date().toISOString(),
      })
      .select('id, status')
      .maybeSingle();

    if (claimErr) {
      // Row already exists - inspect current processing state
      const { data: existingEvent } = await supabaseAdmin
        .from('payment_events')
        .select('id, status, received_at')
        .eq('provider', 'razorpay')
        .eq('provider_event_id', providerEventId)
        .maybeSingle();

      if (existingEvent?.status === 'processed') {
        return NextResponse.json({
          success: true,
          message: 'Event already processed idempotently.',
          event_id: providerEventId,
        });
      }

      const ageMs = Date.now() - new Date(existingEvent?.received_at || 0).getTime();
      if (existingEvent?.status === 'processing' && ageMs < 5 * 60 * 1000) {
        return NextResponse.json({
          success: true,
          message: 'Event is actively being processed by concurrent worker.',
          event_id: providerEventId,
        });
      }

      // If older than 5 minutes (stale processing crash), attempt an atomic ownership reclaim
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const { data: reclaimed, error: reclaimErr } = await supabaseAdmin
        .from('payment_events')
        .update({
          status: 'processing',
          received_at: nowIso,
        })
        .eq('provider', 'razorpay')
        .eq('provider_event_id', providerEventId)
        .eq('status', 'processing')
        .lt('received_at', fiveMinutesAgo)
        .select('id')
        .maybeSingle();

      if (reclaimErr || !reclaimed) {
        return NextResponse.json({
          success: true,
          message: 'Event ownership could not be reclaimed or was acquired by another concurrent worker.',
          event_id: providerEventId,
        });
      }
    }

    if (!subscriptionId && !userId) {
      await supabaseAdmin
        .from('payment_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', 'razorpay')
        .eq('provider_event_id', providerEventId);
      return NextResponse.json({ success: true, message: 'Event ignored: no identifier found.' });
    }

    // 3. Process events idempotently with monotonic ordering
    let targetStatus = null;
    const isCharged = event === 'subscription.activated' || event === 'subscription.charged' || event === 'payment.captured';

    if (isCharged) {
      targetStatus = 'active';
    } else if (event === 'payment.failed' || event === 'subscription.pending' || event === 'subscription.halted') {
      targetStatus = 'past_due';
    } else if (event === 'subscription.cancelled') {
      targetStatus = 'cancelled';
    } else if (event === 'subscription.completed' || event === 'subscription.expired') {
      targetStatus = 'expired';
    }

    if (!targetStatus) {
      await supabaseAdmin
        .from('payment_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', 'razorpay')
        .eq('provider_event_id', providerEventId);
      return NextResponse.json({ success: true, message: `Event ${event} received but requires no status transition.` });
    }

    const nextEnd = entity.current_end
      ? new Date(entity.current_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const updatePayload = {
      status: targetStatus,
      razorpay_customer_id: entity.customer_id || null,
      razorpay_payment_id: entity.payment_id || entity.id,
      razorpay_subscription_id: subscriptionId,
      trial_claimed: true,
      current_period_start: entity.current_start ? new Date(entity.current_start * 1000).toISOString() : new Date().toISOString(),
      current_period_end: nextEnd,
      updated_at: new Date().toISOString(),
    };

    // 4. Monotonic Subscription State Guard:
    // Out-of-order event protection: Never let an older cancellation or failure downgrade
    // an active subscription whose renewal has already set a later current_period_end.
    let applyStatusUpdate = true;
    if (userId) {
      const { data: existingSub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status, current_period_end, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        if (existingSub.status === 'active' && !isCharged) {
          const existingEndTime = new Date(existingSub.current_period_end || 0).getTime();
          const incomingEndTime = new Date(nextEnd).getTime();
          if (existingEndTime > incomingEndTime) {
            console.warn(`[RazorpayWebhook] Monotonic guard: Suppressed out-of-order ${targetStatus} event for user ${userId}. Active period (${existingSub.current_period_end}) is later than incoming event period (${nextEnd}).`);
            applyStatusUpdate = false;
          }
        }
      }
    }

    if (applyStatusUpdate) {
      if (userId) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('subscriptions')
          .update(updatePayload)
          .eq('user_id', userId)
          .select('id');

        if (updateErr) throw updateErr;

        // If user row does not exist yet, create it
        if (!updated || updated.length === 0) {
          const { error: insertErr } = await supabaseAdmin.from('subscriptions').insert({
            ...updatePayload,
            user_id: userId,
            plan_name: entity.notes?.planName || 'InboxIQ Pro',
          });
          if (insertErr) throw insertErr;
        }

        if (isCharged) {
          const { error: settingsErr } = await supabaseAdmin
            .from('user_settings')
            .upsert({ user_id: userId, onboarding_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          if (settingsErr) console.warn('[RazorpayWebhook] Settings update warning:', settingsErr.message);
        }
      } else if (subscriptionId) {
        const { error: subErr } = await supabaseAdmin
          .from('subscriptions')
          .update(updatePayload)
          .eq('razorpay_subscription_id', subscriptionId);
        if (subErr) throw subErr;
      }
    }

    // Authoritatively mark payment event as processed
    await supabaseAdmin
      .from('payment_events')
      .update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider', 'razorpay')
      .eq('provider_event_id', providerEventId);

    // 5. Transactional Email Outbox / Direct Delivery with Outbox Fallback
    if (userEmail) {
      let emailType = null;
      let emailPayload = null;

      if (isCharged) {
        emailType = 'renewal_confirmation';
        emailPayload = {
          userId,
          email: userEmail,
          name: entity.notes?.userName || '',
          planName: entity.notes?.planName || 'InboxIQ Pro',
          amount: entity.amount ? Math.round(entity.amount / 100) : 99,
          currency: entity.currency || 'INR',
          paymentId: entity.payment_id || entity.id,
          nextRenewalDate: nextEnd,
        };
      } else if (event === 'subscription.cancelled') {
        emailType = 'subscription_cancelled';
        emailPayload = {
          userId,
          email: userEmail,
          name: entity.notes?.userName || '',
          planName: entity.notes?.planName || 'InboxIQ Pro',
          expiryDate: nextEnd,
        };
      } else if (event === 'subscription.completed' || event === 'subscription.expired' || event === 'subscription.halted') {
        emailType = 'subscription_expired';
        emailPayload = {
          userId,
          email: userEmail,
          name: entity.notes?.userName || '',
          planName: entity.notes?.planName || 'InboxIQ Pro',
        };
      }

      if (emailType && emailPayload) {
        // Enqueue into durable email_outbox table for guarantee
        try {
          await supabaseAdmin.from('email_outbox').insert({
            user_id: userId || null,
            recipient_email: userEmail,
            subject: `InboxIQ: ${emailType.replace(/_/g, ' ')}`,
            email_type: emailType,
            payload: emailPayload,
            status: 'pending',
          });
        } catch (outboxErr) {
          console.warn('[RazorpayWebhook] Outbox enqueue note:', outboxErr.message);
        }

        // Attempt immediate delivery
        try {
          if (emailType === 'renewal_confirmation') {
            await sendRenewalConfirmationEmail(emailPayload);
          } else if (emailType === 'subscription_cancelled') {
            await sendSubscriptionCancelledEmail(emailPayload);
          } else if (emailType === 'subscription_expired') {
            await sendSubscriptionExpiredEmail(emailPayload);
          }
          // Mark outbox row as sent if recorded
          await supabaseAdmin
            .from('email_outbox')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('recipient_email', userEmail)
            .eq('email_type', emailType)
            .eq('status', 'pending');
        } catch (mailErr) {
          console.error('[RazorpayWebhook] Immediate delivery deferred to email outbox:', mailErr.message);
          await supabaseAdmin
            .from('email_outbox')
            .update({ status: 'failed', last_error: mailErr.message })
            .eq('recipient_email', userEmail)
            .eq('email_type', emailType)
            .eq('status', 'pending');
        }
      }
    }

    // 6. Mark payment event as processed
    await supabaseAdmin
      .from('payment_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('provider', 'razorpay')
      .eq('provider_event_id', providerEventId);

    return NextResponse.json({ success: true, processed_event: event, event_id: providerEventId });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
