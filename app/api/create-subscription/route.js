import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { getRazorpayClient } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';
import { getPlanForProfession, getRecurringRazorpayPlanId } from '@/lib/pricing';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));

    const requestedCurrency = body.currency === 'USD' ? 'USD' : 'INR';
    const planInfo = getPlanForProfession(user.profession, requestedCurrency);
    const amount = planInfo.activePricing.amount;

    let planConfigId = getRecurringRazorpayPlanId(user.profession, requestedCurrency);
    let activeCurrency = requestedCurrency;
    let activeAmount = amount;
    const razorpay = getRazorpayClient();

    if (!planConfigId) {
      // Auto-create monthly plan in Razorpay if not pre-configured
      try {
        const createdPlan = await razorpay.plans.create({
          period: 'monthly',
          interval: 1,
          item: {
            name: `${planInfo.name} (Monthly)`,
            amount: activeAmount * 100, // in smallest currency unit (paise / cents)
            currency: activeCurrency,
            description: `Monthly recurring subscription for ${planInfo.target}`,
          },
        });
        planConfigId = createdPlan.id;
      } catch (planErr) {
        console.warn('Razorpay dynamic plan creation fallback:', planErr.message);
        // If USD is not enabled on Razorpay merchant account, fall back to INR seamlessly
        if (activeCurrency !== 'INR') {
          activeCurrency = 'INR';
          const inrPlanInfo = getPlanForProfession(user.profession, 'INR');
          activeAmount = inrPlanInfo.activePricing.amount;
          planConfigId = getRecurringRazorpayPlanId(user.profession, 'INR');

          if (!planConfigId) {
            try {
              const inrPlan = await razorpay.plans.create({
                period: 'monthly',
                interval: 1,
                item: {
                  name: `${inrPlanInfo.name} (Monthly)`,
                  amount: activeAmount * 100,
                  currency: 'INR',
                  description: `Monthly recurring subscription for ${inrPlanInfo.target}`,
                },
              });
              planConfigId = inrPlan.id;
            } catch (inrErr) {
              console.warn('INR fallback plan notice:', inrErr.message);
            }
          }
        }
      }
    }

    if (!planConfigId) {
      throw new AppError(
        ErrorCategories.CONFIGURATION_ERROR,
        `A monthly Razorpay plan is not configured for ${planInfo.name}.`,
        500
      );
    }

    const sub = await razorpay.subscriptions.create({
      plan_id: planConfigId,
      total_count: 120, // 10 years of monthly billing
      quantity: 1,
      customer_notify: 1,
      notes: {
        userId: user.id,
        userEmail: user.email,
        planId: planInfo.id,
        profession: user.profession,
        currency: requestedCurrency,
      },
    });
    const subscriptionId = sub.id;

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
        cancel_at_cycle_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({
      success: true,
      subscriptionId,
      amount,
      currency: requestedCurrency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
