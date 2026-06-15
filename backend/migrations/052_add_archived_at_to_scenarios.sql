-- Migration: 052_add_archived_at_to_scenarios
-- Description: Add archived_at column to scenarios table
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
