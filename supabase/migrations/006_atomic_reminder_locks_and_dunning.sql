-- Migration 006: Atomic Mutex Locks for Renewal Reminders and Lifecycle Dunning Protection
-- Prevents duplicate renewal reminder emails under concurrent cron triggers (pg_cron + cron-job.org).

-- 1. Create Atomic Reminder Dispatch Claim Function
CREATE OR REPLACE FUNCTION public.claim_reminder_dispatch_lock(
  p_user_id UUID,
  p_report_date DATE,
  p_reminder_type TEXT,
  p_execution_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Row-level exclusive lock on the reports table for this user, date, and reminder type
  SELECT id, status, email_delivery_status, created_at, updated_at
  INTO v_existing
  FROM public.reports
  WHERE user_id = p_user_id
    AND report_date = p_report_date
    AND report_type = p_reminder_type
  FOR UPDATE;

  IF FOUND THEN
    -- If already delivered or successfully sent, strictly reject concurrent send
    IF v_existing.status = 'delivered' OR v_existing.email_delivery_status = 'delivered' THEN
      RETURN FALSE;
    END IF;

    -- If another worker is actively sending right now (within last 15 minutes), strictly reject
    IF v_existing.status IN ('queued', 'processing', 'sending') OR v_existing.email_delivery_status IN ('sending', 'pending') THEN
      IF COALESCE(v_existing.updated_at, v_existing.created_at) > (NOW() - INTERVAL '15 minutes') THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- Stale lock (> 15 minutes ago from a crashed worker): reclaim the lock
    UPDATE public.reports
    SET status = 'sending',
        email_delivery_status = 'sending',
        execution_id = p_execution_id,
        updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN TRUE;
  ELSE
    -- No record exists yet: atomically insert 'sending' lock immediately
    -- Any concurrent transaction arriving will block on this row or see status = 'sending'
    INSERT INTO public.reports (
      user_id,
      report_date,
      report_type,
      status,
      email_delivery_status,
      drive_upload_status,
      execution_id,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_report_date,
      p_reminder_type,
      'sending',
      'sending',
      'skipped',
      p_execution_id,
      NOW(),
      NOW()
    );

    RETURN TRUE;
  END IF;
END;
$$;
