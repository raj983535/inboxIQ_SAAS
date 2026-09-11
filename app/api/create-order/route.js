import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { getRazorpayClient } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, checkRateLimit } from '@/lib/utils';
import { getPlanForProfession } from '@/lib/pricing';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    
    // Rate limit: Max 10 order creation requests per minute per user
    const rateLimit = checkRateLimit(`create_order_${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      throw new AppError(ErrorCategories.RATE_LIMIT_ERROR, 'Too many payment initialization requests. Please wait a moment.', 429);
    }

    const body = await req.json().catch(() => ({}));
    const requestedCurrency = body.currency === 'USD' ? 'USD' : 'INR';
    const profession = user?.profession || 'professor_teacher';
    const planInfo = getPlanForProfession(profession, requestedCurrency);
    
    // Strict server-side price calculation: NEVER trust client-supplied amount or price overrides
    const amountInPaise = planInfo.activePricing.amount * 100;

    // Minimum amount validation: 100 paise (₹1.00)
    if (!amountInPaise || amountInPaise < 100) {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        'Order amount must be at least 100 paise (₹1.00).',
        400
      );
    }

    const receipt = `rcpt_${Date.now()}`;
    const razorpay = getRazorpayClient();

    const order = await razorpay.orders.create({
      amount: Math.round(amountInPaise),
      currency: requestedCurrency,
      receipt: receipt,
      notes: {
        userId: user.id,
        userEmail: user.email,
        profession: user.profession,
        planId: planInfo.id,
        planName: planInfo.name,
      },
    });

    // Record order intent in subscriptions table
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasActiveAccess =
      existingSub?.status === 'active' ||
      (existingSub?.status === 'trialing' && existingSub?.current_period_end && new Date(existingSub.current_period_end) > new Date());

    if (existingSub?.id) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          plan_id: planInfo.id,
          plan_name: planInfo.name,
          amount: Math.round(amountInPaise / 100),
          currency: requestedCurrency,
          razorpay_order_id: order.id,
          razorpay_subscription_id: order.id,
          status: hasActiveAccess ? existingSub.status : 'created',
          cancel_at_cycle_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);
    } else {
      await supabaseAdmin.from('subscriptions').insert({
        user_id: user.id,
        plan_id: planInfo.id,
        plan_name: planInfo.name,
        amount: Math.round(amountInPaise / 100),
        currency: requestedCurrency,
        razorpay_order_id: order.id,
        razorpay_subscription_id: order.id,
        status: 'created',
        cancel_at_cycle_end: false,
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      keyId: (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim(),
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
