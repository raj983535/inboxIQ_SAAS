-- Migration 005: Atomic Idempotency Locks for Dispatch and Email Delivery
-- Adds updated_at, execution_id, and PostgreSQL mutex functions for race-condition prevention.

-- 1. Add updated_at and execution_id columns to reports if they do not exist
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS execution_id TEXT;

-- 2. Update status and email_delivery_status check constraints to support 'sending'
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_email_delivery_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_email_delivery_status_check 
CHECK (email_delivery_status = ANY (ARRAY['pending'::text, 'sending'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]));

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check 
CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'sending'::text, 'generated'::text, 'delivered'::text, 'archived'::text, 'failed'::text]));

-- 3. Atomic Dispatch Claim Function (Gate 1)
-- Row-level exclusive lock preventing concurrent cron triggers from double-dispatching to n8n
CREATE OR REPLACE FUNCTION public.claim_daily_briefing_dispatch(
  p_user_id UUID,
  p_report_date DATE,
  p_execution_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Row-level exclusive lock
  SELECT id, status, email_delivery_status, created_at, updated_at
  INTO v_existing
  FROM public.reports
  WHERE user_id = p_user_id
    AND report_date = p_report_date
    AND report_type = 'daily'
  FOR UPDATE;

  IF FOUND THEN
    -- If already delivered, strictly skip
    IF v_existing.status = 'delivered' OR v_existing.email_delivery_status = 'delivered' THEN
      RETURN FALSE;
    END IF;

    -- If actively in-flight or sending within the last 15 minutes, strictly skip
    IF v_existing.status IN ('queued', 'processing', 'sending') THEN
      IF COALESCE(v_existing.updated_at, v_existing.created_at) > (NOW() - INTERVAL '15 minutes') THEN
        RETURN FALSE;
      END IF;
    END IF;

    -- If older than 15 minutes (stale zombie lock from crashed run), allow retry
    UPDATE public.reports
    SET status = 'queued',
        email_delivery_status = 'pending',
        execution_id = p_execution_id,
        updated_at = NOW()
    WHERE id = v_existing.id;

    RETURN TRUE;
  ELSE
    -- No record exists yet: insert new queued report intent
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
      'daily',
      'queued',
      'pending',
      'skipped',
      p_execution_id,
      NOW(),
      NOW()
    );

    RETURN TRUE;
  END IF;
END;
$$;

-- 4. Atomic Email Delivery Lock Function (Gate 2)
-- Row-level exclusive lock preventing concurrent webhook executions from double-sending via Gmail API
CREATE OR REPLACE FUNCTION public.claim_email_delivery_lock(
  p_user_id UUID,
  p_report_date DATE,
  p_execution_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Row-level exclusive lock
  SELECT id, status, email_delivery_status, updated_at
  INTO v_existing
  FROM public.reports
  WHERE user_id = p_user_id
    AND report_date = p_report_date
    AND report_type = 'daily'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Insert with sending lock
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
      'daily',
      'processing',
      'sending',
      'skipped',
      p_execution_id,
      NOW(),
      NOW()
    );
    RETURN TRUE;
  END IF;

  -- If already delivered, abort immediately
  IF v_existing.status = 'delivered' OR v_existing.email_delivery_status = 'delivered' THEN
    RETURN FALSE;
  END IF;

  -- If another worker is actively sending right now (within last 5 minutes), abort immediately
  IF v_existing.email_delivery_status = 'sending' THEN
    IF COALESCE(v_existing.updated_at, NOW()) > (NOW() - INTERVAL '5 minutes') THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Acquire the exclusive sending lock
  UPDATE public.reports
  SET email_delivery_status = 'sending',
      status = 'processing',
      execution_id = COALESCE(p_execution_id, v_existing.id::text),
      updated_at = NOW()
  WHERE id = v_existing.id;

  RETURN TRUE;
END;
$$;
