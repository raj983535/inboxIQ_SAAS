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
      .select('razorpay_subscription_id, status').eq('user_id', user.id).single();
    if (error || !subscription?.razorpay_subscription_id) {
      throw new AppError(ErrorCategories.PAYMENT_ERROR, 'No active recurring subscription was found.', 404);
    }

    await getRazorpayClient().subscriptions.cancel(subscription.razorpay_subscription_id, true);
    const { error: updateError } = await supabaseAdmin.from('subscriptions').update({
      cancel_at_cycle_end: true,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    if (updateError) throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to record your cancellation request.', 500);
    return NextResponse.json({ success: true, message: 'Your subscription will not renew after the current billing period.' });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
