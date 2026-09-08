import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { verifyPaymentSignature } from '@/lib/razorpay/razorpay';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';
import { getPlanForProfession } from '@/lib/pricing';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const body = await req.json().catch(() => ({}));

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, currency } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        'Missing required payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
        400
      );
    }

    // Step 3: Verify HMAC-SHA256 signature
    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      throw new AppError(
        ErrorCategories.SECURITY_VIOLATION,
        'Payment signature verification failed. The transaction cannot be validated.',
        400
      );
    }

    const requestedCurrency = currency === 'USD' ? 'USD' : 'INR';
    const profession = user?.profession || 'professor_teacher';
    const planInfo = getPlanForProfession(profession, requestedCurrency);
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Mark subscription and user account as active in database
    await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: user.id,
        plan_id: planId || planInfo.id,
        plan_name: planInfo.name,
        amount: planInfo.activePricing.amount,
        currency: requestedCurrency,
        razorpay_subscription_id: razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        cancel_at_cycle_end: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // Update user onboarding completed flag if needed
    await supabaseAdmin
      .from('user_settings')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Payment verified and monthly subscription activated successfully.',
      subscription: {
        status: 'active',
        plan: planInfo.name,
        current_period_end: periodEnd,
      },
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
