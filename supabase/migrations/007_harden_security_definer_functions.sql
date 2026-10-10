-- Migration 007: Harden Security Definer Functions with Explicit search_path and Revoked Public Access
-- Fixes F-06 by ensuring functions run with fixed search_path = pg_catalog, public
-- and revokes execution rights from PUBLIC, anon, and authenticated so only service_role can execute.

-- 1. claim_daily_briefing_dispatch hardening
CREATE OR REPLACE FUNCTION public.claim_daily_briefing_dispatch(
  p_user_id UUID,
  p_report_date DATE,
  p_execution_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
    -- Atomically insert the queued record
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
      'pending',
      p_execution_id,
      NOW(),
      NOW()
    );

    RETURN TRUE;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
END;
$$;

-- 2. claim_reminder_dispatch_lock hardening
CREATE OR REPLACE FUNCTION public.claim_reminder_dispatch_lock(
  p_user_id UUID,
  p_report_date DATE,
  p_reminder_type TEXT,
  p_execution_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
      'pending',
      p_execution_id,
      NOW(),
      NOW()
    );

    RETURN TRUE;
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
END;
$$;

-- 3. Revoke default PUBLIC execution to prevent unauthorized PostgREST/client RPC invocation
REVOKE EXECUTE ON FUNCTION public.claim_daily_briefing_dispatch(UUID, DATE, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_reminder_dispatch_lock(UUID, DATE, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Grant execution to service_role and postgres roles
GRANT EXECUTE ON FUNCTION public.claim_daily_briefing_dispatch(UUID, DATE, TEXT) TO service_role, postgres;
GRANT EXECUTE ON FUNCTION public.claim_reminder_dispatch_lock(UUID, DATE, TEXT, TEXT) TO service_role, postgres;
