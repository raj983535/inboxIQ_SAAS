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

    if (!subscriptionId && !userId) {
      return NextResponse.json({ success: true, message: 'Event ignored: no identifier found.' });
    }

    // 3. Process events idempotently
    let targetStatus = 'active';
    const isCharged = event === 'subscription.activated' || event === 'subscription.charged' || event === 'payment.captured';

    if (isCharged) {
      targetStatus = 'active';
    } else if (event === 'subscription.pending' || event === 'subscription.halted') {
      targetStatus = 'past_due';
    } else if (event === 'subscription.cancelled') {
      targetStatus = 'cancelled';
    } else if (event === 'subscription.completed' || event === 'subscription.expired') {
      targetStatus = 'expired';
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

    // 4. Update Supabase
    if (userId) {
      await supabaseAdmin
        .from('subscriptions')
        .update(updatePayload)
        .eq('user_id', userId);
    } else if (subscriptionId) {
      await supabaseAdmin
        .from('subscriptions')
        .update(updatePayload)
        .eq('razorpay_subscription_id', subscriptionId);
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
        console.warn('Webhook notification email notice:', mailErr.message);
      }
    }

    return NextResponse.json({ success: true, processed_event: event });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
