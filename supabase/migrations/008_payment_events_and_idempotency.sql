-- Migration 008: Payment Events and Idempotency
-- Creates payment_events table for deduplicating payment webhooks (Razorpay, etc.)

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processing', 'processed', 'failed')),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_status
  ON public.payment_events(status);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_events_service_role ON public.payment_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
