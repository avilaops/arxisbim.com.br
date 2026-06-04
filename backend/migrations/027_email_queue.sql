-- Migration 027: email_queue — retry queue for transactional emails
-- Persists outbound emails before calling Resend/SMTP.
-- Worker retries pending rows up to max_attempts with backoff.

CREATE TABLE IF NOT EXISTS email_queue (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  "to"          VARCHAR(255) NOT NULL,
  subject       VARCHAR(500) NOT NULL,
  html          TEXT         NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempts      INTEGER      NOT NULL DEFAULT 0,
  max_attempts  INTEGER      NOT NULL DEFAULT 3,
  last_error    TEXT,
  scheduled_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  sent_at       TIMESTAMP,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  metadata      JSONB
);

CREATE INDEX IF NOT EXISTS email_queue_status_idx       ON email_queue(status);
CREATE INDEX IF NOT EXISTS email_queue_scheduled_at_idx ON email_queue(scheduled_at);
