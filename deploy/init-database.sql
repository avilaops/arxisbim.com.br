-- S19→S26 Database Initialization Script
-- Run this BEFORE deploying backend (creates baseline schema)

-- Create database if not exists
CREATE DATABASE arxisvr_staging
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

\connect arxisvr_staging;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create _migrations table (backend will populate this)
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Verify setup
SELECT 'Database initialized successfully' as status,
       current_database() as database,
       pg_postmaster_version() as postgresql_version,
       (SELECT COUNT(*) FROM pg_extension) as extensions_enabled;
