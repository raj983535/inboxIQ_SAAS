-- Migration 004: Add trial_ended and subscription_ended statuses
-- Allows clear differentiation between actively trialing users and expired trial/subscription users.

-- 1. Drop existing check constraint and re-create with expanded statuses
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'inactive',
    'created',
    'active',
    'trialing',
    'trial_ended',
    'subscription_ended',
    'past_due',
    'cancelled',
    'expired',
    'failed'
  ));

-- 2. Immediate one-time transition of expired trials to 'trial_ended'
UPDATE public.subscriptions
SET
  status = 'trial_ended',
  updated_at = NOW()
WHERE
  status = 'trialing'
  AND (
    (trial_ends_at IS NOT NULL AND trial_ends_at <= NOW())
    OR (current_period_end IS NOT NULL AND current_period_end <= NOW())
  );

-- 3. Transition any expired paid subscriptions to 'subscription_ended'
UPDATE public.subscriptions
SET
  status = 'subscription_ended',
  updated_at = NOW()
WHERE
  status IN ('past_due', 'expired')
  OR (
    status IN ('active', 'cancelled')
    AND current_period_end IS NOT NULL
    AND current_period_end <= NOW()
    AND (trial_claimed IS FALSE OR trial_ends_at IS NULL)
  );
