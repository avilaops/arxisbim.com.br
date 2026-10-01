-- Migration 053: Add processing queue fields to ifc_models and composite index on model_elements

ALTER TABLE "ifc_models" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'queued' NOT NULL;
ALTER TABLE "ifc_models" ADD COLUMN IF NOT EXISTS "processing_error" text;
ALTER TABLE "ifc_models" ADD COLUMN IF NOT EXISTS "processing_attempts" integer DEFAULT 0 NOT NULL;
ALTER TABLE "ifc_models" ADD COLUMN IF NOT EXISTS "processing_started_at" timestamp;
ALTER TABLE "ifc_models" ADD COLUMN IF NOT EXISTS "processing_completed_at" timestamp;

CREATE INDEX IF NOT EXISTS "model_elements_ifc_model_express_idx" ON "model_elements" USING btree ("ifc_model_id", "express_id");
