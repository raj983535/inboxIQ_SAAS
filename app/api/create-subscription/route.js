import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { getRazorpayClient } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';
import { getPlanForProfession } from '@/lib/pricing';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));

    const requestedCurrency = body.currency === 'USD' ? 'USD' : 'INR';
    const planInfo = getPlanForProfession(user.profession, requestedCurrency);
    const amount = planInfo.activePricing.amount;

    let subscriptionId = `sub_${Date.now()}`;
    let orderId = `order_${Date.now()}`;

    try {
      const razorpay = getRazorpayClient();
      const planConfigId = process.env.RAZORPAY_PLAN_ID;

      if (planConfigId) {
        const sub = await razorpay.subscriptions.create({
          plan_id: planConfigId,
          total_count: 12,
          quantity: 1,
          customer_notify: 1,
          notes: {
            userId: user.id,
            userEmail: user.email,
            profession: user.profession,
            currency: requestedCurrency,
          },
        });
        subscriptionId = sub.id;
      } else {
        const order = await razorpay.orders.create({
          amount: amount * 100, // in smallest currency unit (paise or cents)
          currency: requestedCurrency,
          receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId: user.id,
            planId: planInfo.id,
            profession: user.profession,
          },
        });
        orderId = order.id;
        subscriptionId = `sub_order_${order.id}`;
      }
    } catch (rzpErr) {
      console.warn('Razorpay server SDK notice (fallback tracking):', rzpErr.message);
    }

    // Save/update subscription intent state in database
    await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_id: planInfo.id,
        plan_name: planInfo.name,
        amount: amount,
        currency: requestedCurrency,
        razorpay_subscription_id: subscriptionId,
        status: 'created',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({
      success: true,
      subscriptionId,
      orderId,
      amount,
      currency: requestedCurrency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
