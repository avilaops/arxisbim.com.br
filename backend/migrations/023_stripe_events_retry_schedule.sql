-- =====================================
-- Migration 023: Stripe webhook retry scheduling
-- =====================================
-- Add next retry timestamp for failed webhook event backoff and ops reprocessing.
-- =====================================

ALTER TABLE stripe_events
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS stripe_events_next_retry_at_idx ON stripe_events(next_retry_at);

COMMENT ON COLUMN stripe_events.next_retry_at IS 'Next scheduled retry time for failed webhook processing with exponential backoff';
