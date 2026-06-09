-- 010_analytics_events.sql
-- Rastreamento first-party (próprio). Aceita visitante ANÔNIMO (sem tenant/FK).
-- Visível só no painel do super-admin.

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anon_id     varchar(64),
  session_id  varchar(64),
  user_id     uuid,
  tenant_id   varchar(255),            -- SEM FK: anônimo não tem tenant
  name        varchar(120) NOT NULL,
  category    varchar(60),
  path        varchar(512),
  referrer    varchar(512),
  utm         jsonb,
  props       jsonb,
  ip          varchar(64),
  user_agent  text,
  country     varchar(2),
  timestamp   timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_timestamp_idx      ON analytics_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS analytics_events_name_timestamp_idx ON analytics_events (name, timestamp DESC);
CREATE INDEX IF NOT EXISTS analytics_events_anon_idx           ON analytics_events (anon_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx           ON analytics_events (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS analytics_events_path_idx           ON analytics_events (path);
CREATE INDEX IF NOT EXISTS analytics_events_category_idx       ON analytics_events (category, timestamp DESC);
