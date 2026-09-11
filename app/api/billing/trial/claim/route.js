import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, checkRateLimit } from '@/lib/utils';
import { getPlanForProfession, TRIAL_CONFIG } from '@/lib/pricing';
import { sendTrialActivatedEmail } from '@/lib/email';

/**
 * POST /api/billing/trial/claim
 *
 * Server-side 3-day free trial activation.
 * - One-time only per user (trial_claimed flag)
 * - Server timestamps (no frontend dates accepted)
 * - Rate limited to prevent double-click abuse
 */
export async function POST() {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    // Rate limit: Max 5 trial claim attempts per minute per user
    const rateLimit = checkRateLimit(`trial_claim_${user.id}`, 5, 60000);
    if (!rateLimit.allowed) {
      throw new AppError(
        ErrorCategories.RATE_LIMIT_ERROR,
        'Too many requests. Please wait a moment before trying again.',
        429
      );
    }

    // 1. Check existing subscription state
    const { data: existingSub, error: fetchErr } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status, trial_claimed, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to check subscription state.', 500);
    }

    // 2. Block if trial already claimed
    if (existingSub?.trial_claimed) {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        'You have already used your free trial. Please subscribe to continue using InboxIQ.',
        409
      );
    }

    // 3. Block if already actively subscribed
    if (existingSub?.status === 'active') {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        'You already have an active subscription.',
        409
      );
    }

    // 4. Calculate trial period — server timestamp only
    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_CONFIG.duration_hours * 60 * 60 * 1000);
    const nowIso = now.toISOString();
    const trialEndIso = trialEnd.toISOString();

    // 5. Resolve plan details from server-side pricing config
    const profession = user.profession || 'professor_teacher';
    const currency = user.country === 'India' ? 'INR' : 'USD';
    const planInfo = getPlanForProfession(profession, currency);

    // 6. Build subscription payload
    const subPayload = {
      user_id: user.id,
      plan_id: planInfo.id,
      plan_name: planInfo.name,
      amount: planInfo.activePricing.amount,
      currency: currency,
      status: 'trialing',
      trial_started_at: nowIso,
      trial_ends_at: trialEndIso,
      trial_claimed: true,
      current_period_start: nowIso,
      current_period_end: trialEndIso,
      updated_at: nowIso,
    };

    // 7. Upsert — update existing row or insert new
    if (existingSub?.id) {
      const { error: updateErr } = await supabaseAdmin
        .from('subscriptions')
        .update(subPayload)
        .eq('id', existingSub.id);

      if (updateErr) {
        throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to activate trial: ' + updateErr.message, 500);
      }
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('subscriptions')
        .insert(subPayload);

      if (insertErr) {
        throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to activate trial: ' + insertErr.message, 500);
      }
    }

    // 8. Mark onboarding as completed
    await supabaseAdmin
      .from('user_settings')
      .upsert(
        {
          user_id: user.id,
          onboarding_completed: true,
          updated_at: nowIso,
        },
        { onConflict: 'user_id' }
      );

    // 9. Send welcome notification email (non-blocking)
    if (user.email) {
      sendTrialActivatedEmail({
        email: user.email,
        name: user.name || '',
        planName: planInfo.name,
        trialEndsAt: trialEndIso,
      }).catch((emailErr) => {
        console.error('[Trial Claim] Failed to dispatch trial activation email:', emailErr);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Your ${TRIAL_CONFIG.duration_hours}-hour free trial is now active!`,
      trial: {
        status: 'trialing',
        trial_started_at: nowIso,
        trial_ends_at: trialEndIso,
        hours_remaining: TRIAL_CONFIG.duration_hours,
        plan: planInfo.name,
      },
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
