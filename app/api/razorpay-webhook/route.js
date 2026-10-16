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

    // 2.5 Idempotency Guard: Deduplicate against payment_events table
    const { data: existingEvent } = await supabaseAdmin
      .from('payment_events')
      .select('status')
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

    if (!existingEvent) {
      await supabaseAdmin.from('payment_events').insert({
        provider: 'razorpay',
        provider_event_id: providerEventId,
        event_type: event || 'unknown',
        status: 'processing',
        received_at: new Date().toISOString(),
      });
    }

    if (!subscriptionId && !userId) {
      await supabaseAdmin
        .from('payment_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('provider', 'razorpay')
        .eq('provider_event_id', providerEventId);
      return NextResponse.json({ success: true, message: 'Event ignored: no identifier found.' });
    }

    // 3. Process events idempotently
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

    // 4. Update Supabase with verified error handling
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

    // 5. Send automated email notifications to user based on event
    if (userEmail) {
      try {
        if (isCharged) {
          await sendRenewalConfirmationEmail({
            email: userEmail,
            name: entity.notes?.userName || '',
            planName: entity.notes?.planName || 'InboxIQ Pro',
            amount: entity.amount ? Math.round(entity.amount / 100) : 99,
            currency: entity.currency || 'INR',
            paymentId: entity.payment_id || entity.id,
            nextRenewalDate: nextEnd,
          });
        } else if (event === 'subscription.cancelled') {
          await sendSubscriptionCancelledEmail({
            email: userEmail,
            name: entity.notes?.userName || '',
            planName: entity.notes?.planName || 'InboxIQ Pro',
            expiryDate: nextEnd,
          });
        } else if (event === 'subscription.completed' || event === 'subscription.expired' || event === 'subscription.halted') {
          await sendSubscriptionExpiredEmail({
            email: userEmail,
            name: entity.notes?.userName || '',
            planName: entity.notes?.planName || 'InboxIQ Pro',
          });
        }
      } catch (mailErr) {
        console.warn('[RazorpayWebhook] Notification email notice:', mailErr.message);
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
