-- Migration 003: Add 3-Day Free Trial Support
-- This migration is ADDITIVE — no existing data is deleted or modified.

-- 1. Add trial columns to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_claimed BOOLEAN NOT NULL DEFAULT false;

-- 2. Expand status CHECK constraint to allow 'trialing'
--    (Must DROP old constraint and re-CREATE with new values)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('inactive', 'created', 'active', 'trialing', 'past_due', 'cancelled', 'expired', 'failed'));

-- 3. Partial index for trial expiry queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at
  ON public.subscriptions(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- 4. Mark existing paying/active users as trial_claimed = true
--    (prevents them from claiming a free trial retroactively)
UPDATE public.subscriptions
  SET trial_claimed = true
  WHERE status IN ('active', 'cancelled', 'expired', 'past_due', 'failed')
    AND trial_claimed = false;
