import { NextResponse } from 'next/server';
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    // 1. Must read raw body as text for HMAC verification per Section 55.19
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Missing Razorpay signature header.', 400);
    }

    // 2. Verify webhook signature
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid && process.env.NODE_ENV === 'production') {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Invalid Razorpay webhook signature.', 401);
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity || {};

    const subscriptionId = entity.id || entity.subscription_id;
    const userId = entity.notes?.userId;

    if (!subscriptionId && !userId) {
      return NextResponse.json({ success: true, message: 'Event ignored: no identifier found.' });
    }

    // 3. Process events idempotently
    let targetStatus = 'active';
    if (event === 'subscription.activated' || event === 'subscription.charged' || event === 'payment.captured') {
      targetStatus = 'active';
    } else if (event === 'subscription.pending' || event === 'subscription.halted') {
      targetStatus = 'past_due';
    } else if (event === 'subscription.cancelled') {
      targetStatus = 'cancelled';
    } else if (event === 'subscription.completed' || event === 'subscription.expired') {
      targetStatus = 'expired';
    }
    const cancelled = event === 'subscription.cancelled';

    // 4. Update Supabase
    if (userId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: targetStatus,
          razorpay_payment_id: entity.payment_id || entity.id,
          current_period_start: entity.current_start ? new Date(entity.current_start * 1000).toISOString() : new Date().toISOString(),
          current_period_end: entity.current_end ? new Date(entity.current_end * 1000).toISOString() : null,
          cancel_at_cycle_end: cancelled,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else if (subscriptionId) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: targetStatus,
          cancel_at_cycle_end: cancelled,
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', subscriptionId);
    }

    return NextResponse.json({ success: true, processed_event: event });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
