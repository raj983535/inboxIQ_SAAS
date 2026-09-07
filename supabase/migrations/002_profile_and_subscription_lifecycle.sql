-- Required profile completion and recurring-subscription lifecycle fields.
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_cycle_end BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_settings_profile_completed
  ON public.user_settings(profile_completed);
