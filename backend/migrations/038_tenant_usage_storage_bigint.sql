-- 038: tenant_usage.storage_bytes int4 -> bigint (int4 overflows at ~2.1GB)
ALTER TABLE tenant_usage ALTER COLUMN storage_bytes TYPE BIGINT;
