import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

/**
 * GET /api/billing/trial/status
 *
 * Returns the trial state for the authenticated user.
 */
export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    const { data: sub, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('status, trial_started_at, trial_ends_at, trial_claimed, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to fetch trial status.', 500);
    }

    if (!sub) {
      return NextResponse.json({
        success: true,
        trial_claimed: false,
        is_trial_active: false,
        is_trial_expired: false,
        trial_ends_at: null,
        hours_remaining: null,
        subscription_status: null,
      });
    }

    const now = new Date();
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    const isTrialing = sub.status === 'trialing' && trialEnd && trialEnd > now;
    const isTrialExpired = sub.status === 'trialing' && trialEnd && trialEnd <= now;
    const hoursRemaining = isTrialing
      ? Math.max(0, Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10)
      : 0;

    return NextResponse.json({
      success: true,
      trial_claimed: sub.trial_claimed || false,
      is_trial_active: isTrialing,
      is_trial_expired: isTrialExpired,
      trial_started_at: sub.trial_started_at || null,
      trial_ends_at: sub.trial_ends_at || null,
      hours_remaining: hoursRemaining,
      subscription_status: sub.status,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
