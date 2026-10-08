import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getRazorpayClient } from '@/lib/razorpay/razorpay';
import { AppError, ErrorCategories, formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST() {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const { data: subscription, error } = await supabaseAdmin.from('subscriptions')
      .select('razorpay_subscription_id, status').eq('user_id', user.id).maybeSingle();

    if (error) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to retrieve subscription record.', 500);
    }

    if (!subscription) {
      throw new AppError(ErrorCategories.PAYMENT_ERROR, 'No active subscription was found.', 404);
    }

    if (subscription.status === 'trialing' && !subscription.razorpay_subscription_id) {
      return NextResponse.json({
        success: true,
        message: 'You are currently on a free trial with no payment method attached. No recurring charges will occur.',
      });
    }

    // If it's a recurring Razorpay subscription (starts with sub_)
    if (subscription.razorpay_subscription_id && subscription.razorpay_subscription_id.startsWith('sub_')) {
      try {
        await getRazorpayClient().subscriptions.cancel(subscription.razorpay_subscription_id, true);
      } catch (rzpErr) {
        // If already cancelled or already completed, treat as benign
        const errMsg = rzpErr?.error?.description || rzpErr?.message || '';
        if (!errMsg.toLowerCase().includes('already cancelled') && !errMsg.toLowerCase().includes('cancelled')) {
          console.warn('[CancelSubscription] Razorpay API warning:', errMsg);
        }
      }
    }

    const { error: updateError } = await supabaseAdmin.from('subscriptions').update({
      cancel_at_cycle_end: true,
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    if (updateError) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to record your cancellation request.', 500);
    }

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been cancelled and will not renew after the current billing period.',
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
