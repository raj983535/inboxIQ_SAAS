-- Migration 009: Durable Queue, Webhook Nonce Replay Store, and Email Outbox
-- Provides:
-- 1. report_jobs durable queue for decoupling cron schedule from synchronous network dispatch
-- 2. webhook_nonces store for cryptographic nonce/event replay prevention
-- 3. email_outbox store for reliable transactional email delivery

-- 1. REPORT JOBS (Durable Queue)
CREATE TABLE IF NOT EXISTS public.report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    execution_id TEXT NOT NULL UNIQUE,
    correlation_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    force_native BOOLEAN NOT NULL DEFAULT false,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_jobs_status_scheduled ON public.report_jobs(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_report_jobs_user_date ON public.report_jobs(user_id, report_date);

ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY report_jobs_service_role ON public.report_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. WEBHOOK NONCES (Cryptographic Replay Store)
CREATE TABLE IF NOT EXISTS public.webhook_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL,
    nonce TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(scope, nonce)
);

CREATE INDEX IF NOT EXISTS idx_webhook_nonces_timestamp ON public.webhook_nonces(timestamp);

ALTER TABLE public.webhook_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_nonces_service_role ON public.webhook_nonces FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to prune nonces older than 1 hour
CREATE OR REPLACE FUNCTION public.prune_expired_webhook_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webhook_nonces WHERE created_at < now() - INTERVAL '1 hour';
END;
$$;

-- 3. EMAIL OUTBOX (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS public.email_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    email_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON public.email_outbox(status);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_outbox_service_role ON public.email_outbox FOR ALL TO service_role USING (true) WITH CHECK (true);
