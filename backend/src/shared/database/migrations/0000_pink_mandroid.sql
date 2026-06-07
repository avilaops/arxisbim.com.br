CREATE TYPE "public"."participant_role" AS ENUM('architect', 'client', 'viewer', 'guest');--> statement-breakpoint
CREATE TYPE "public"."presence_status" AS ENUM('online', 'offline', 'reconnecting');--> statement-breakpoint
CREATE TYPE "public"."session_event_type" AS ENUM('material_changed', 'object_moved', 'object_hidden', 'object_isolated', 'annotation_added', 'annotation_removed', 'camera_moved', 'voice_joined', 'voice_left', 'laser_pointed', 'participant_joined', 'participant_left', 'chat_message', 'recording_started', 'recording_stopped', 'session_ended');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('waiting', 'active', 'ended', 'cancelled');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"branding" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "task_element_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"element_id" varchar(255) NOT NULL,
	"action" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"branding" jsonb,
	"subscription" jsonb,
	"settings" jsonb,
	"trial_ends_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
CREATE TABLE "timeline_simulations" (
	"schedule_id" uuid NOT NULL,
	"name" varchar(255),
	"simulation_date" timestamp,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"company_id" varchar(255),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"permissions" jsonb,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verified_at" timestamp,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" varchar(255),
	"two_factor_backup_codes" text,
	"oauth_provider" varchar(50),
	"oauth_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp,
	"last_successful_at" timestamp,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "api_rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"identifier" varchar(255) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resource_id" varchar(255),
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"token_type" varchar(50) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255),
	"user_id" uuid,
	"error_code" varchar(50),
	"error_message" text NOT NULL,
	"stack_trace" text,
	"context" jsonb,
	"severity" varchar(20) DEFAULT 'error' NOT NULL,
	"resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"metric_name" varchar(100) NOT NULL,
	"metric_type" varchar(50) NOT NULL,
	"value" bigint NOT NULL,
	"labels" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"operation" varchar(100) NOT NULL,
	"duration" integer NOT NULL,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"theme" varchar(20) DEFAULT 'dark',
	"language" varchar(10) DEFAULT 'pt-BR',
	"notifications" jsonb DEFAULT '{"email":true,"push":true,"inApp":true}'::jsonb,
	"vr_settings" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"refresh_token" text NOT NULL,
	"device_info" jsonb,
	"expires_at" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"ip_address" varchar(255),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"access_token_jti" varchar(255),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "user_sessions_refresh_token_unique" UNIQUE("refresh_token")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"key_prefix" varchar(10) NOT NULL,
	"key_hash" text NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"scopes" text NOT NULL,
	"rate_limit" varchar(50) DEFAULT '1000/hour',
	"ip_whitelist" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "webauthn_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" varchar(50) DEFAULT '0' NOT NULL,
	"device_type" varchar(50) NOT NULL,
	"transports" text,
	"aaguid" varchar(255),
	"credential_name" varchar(255),
	"last_used_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webauthn_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"channels" jsonb DEFAULT '["in_app"]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"action_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"requested_by_user_id" uuid,
	"plan" varchar(50) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"provider" varchar(50) DEFAULT 'internal' NOT NULL,
	"provider_session_id" varchar(255),
	"checkout_url" text,
	"success_url" text,
	"cancel_url" text,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"subscription_id" uuid,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp,
	"paid_at" timestamp,
	"provider_invoice_id" varchar(255),
	"hosted_invoice_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"subscription_id" uuid,
	"invoice_id" uuid,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"provider" varchar(50) DEFAULT 'internal' NOT NULL,
	"provider_invoice_id" varchar(255),
	"provider_payment_intent_id" varchar(255),
	"paid_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"plan" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"provider" varchar(50) DEFAULT 'internal' NOT NULL,
	"provider_customer_id" varchar(255),
	"provider_subscription_id" varchar(255),
	"provider_price_id" varchar(255),
	"seat_count" integer DEFAULT 1 NOT NULL,
	"max_seats" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"user_id" uuid,
	"metric" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"tenant_id" varchar(255),
	"provider" varchar(50) DEFAULT 'stripe' NOT NULL,
	"status" varchar(50) DEFAULT 'received' NOT NULL,
	"processed_at" timestamp,
	"failed_at" timestamp,
	"next_retry_at" timestamp,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"raw_event" jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"entitlement_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"numeric_value" integer,
	"source" varchar(30) DEFAULT 'plan' NOT NULL,
	"source_ref" varchar(255),
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clash_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"federation_id" uuid,
	"model1_id" uuid NOT NULL,
	"model2_id" uuid NOT NULL,
	"element1_global_id" varchar(50),
	"element1_type" varchar(100),
	"element1_name" varchar(255),
	"element2_global_id" varchar(50),
	"element2_type" varchar(100),
	"element2_name" varchar(255),
	"discipline1" varchar(50),
	"discipline2" varchar(50),
	"clash_type" varchar(20) DEFAULT 'hard' NOT NULL,
	"severity" varchar(20) DEFAULT 'medium' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"location" jsonb,
	"overlap" jsonb,
	"description" text,
	"resolution" text,
	"scan_run_id" uuid,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federated_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"models" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ifc_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_url" text NOT NULL,
	"file_size_bytes" integer,
	"ifc_type" varchar(50),
	"discipline" varchar(50),
	"phase" varchar(50),
	"thumbnail_url" text,
	"uploaded_by" uuid,
	"metadata" jsonb,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ifc_model_id" uuid NOT NULL,
	"express_id" integer NOT NULL,
	"global_id" varchar(50),
	"type" varchar(100) NOT NULL,
	"name" varchar(255),
	"properties" jsonb,
	"geometry" jsonb
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"company_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"location" jsonb,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"preset_id" varchar(80),
	"camera" jsonb NOT NULL,
	"player" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"element_id" varchar(255),
	"position" jsonb,
	"text" text,
	"type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ar_markers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"marker_type" varchar(50) NOT NULL,
	"marker_data" text NOT NULL,
	"name" varchar(255),
	"linked_object_id" varchar(255),
	"position" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collaboration_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"session_name" varchar(255),
	"participants" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "spatial_anchors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"anchor_type" varchar(50) NOT NULL,
	"cloud_anchor_id" varchar(255),
	"position" jsonb,
	"rotation" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vr_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_type" varchar(50) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"duration" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "bim_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"task_name" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"progress" integer DEFAULT 0,
	"dependencies" jsonb,
	"is_critical_path" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"action_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text',
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_collaboration_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"ydoc_update" jsonb NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_collaboration_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid,
	"participant_id" uuid,
	"origin" varchar(50) DEFAULT 'snapshot' NOT NULL,
	"ydoc_update" jsonb NOT NULL,
	"version" integer NOT NULL,
	"is_snapshot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"avatar_state" jsonb,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"last_seen_at" timestamp,
	"is_connected" boolean DEFAULT true,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "meeting_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"recording_url" text,
	"duration" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "virtual_meeting_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"room_url" varchar(255) NOT NULL,
	"meeting_code" varchar(50) NOT NULL,
	"name" varchar(255),
	"created_by" uuid NOT NULL,
	"avatar_settings" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	CONSTRAINT "virtual_meeting_rooms_room_url_unique" UNIQUE("room_url"),
	CONSTRAINT "virtual_meeting_rooms_meeting_code_unique" UNIQUE("meeting_code")
);
--> statement-breakpoint
CREATE TABLE "budget_cost_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"description" varchar(500) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"quantity" real DEFAULT 0 NOT NULL,
	"unit_price" real DEFAULT 0 NOT NULL,
	"total_price" real DEFAULT 0 NOT NULL,
	"linked_elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"project_id" uuid NOT NULL,
	"created_by" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"total_cost" real DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid,
	"guest_name" varchar(255),
	"guest_email" varchar(255),
	"role" "participant_role" DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"first_joined_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"socket_id" varchar(255),
	"status" "presence_status" DEFAULT 'offline' NOT NULL,
	"avatar_state" jsonb,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_billing_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer DEFAULT 0 NOT NULL,
	"plan_slug" varchar(50),
	"billed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"actor_id" uuid,
	"type" "session_event_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"event_start_sequence" integer DEFAULT 1 NOT NULL,
	"event_end_sequence" integer,
	"storage_url" text,
	"duration_seconds" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"host_id" uuid NOT NULL,
	"snapshot_id" varchar(255),
	"state_version" integer DEFAULT 0 NOT NULL,
	"status" "session_status" DEFAULT 'waiting' NOT NULL,
	"invite_token" varchar(64),
	"invite_expires_at" timestamp,
	"max_participants" integer DEFAULT 2 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_rate_limits" ADD CONSTRAINT "api_rate_limits_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_sessions" ADD CONSTRAINT "billing_checkout_sessions_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_invoice_id_billing_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."billing_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_federation_id_federated_models_id_fk" FOREIGN KEY ("federation_id") REFERENCES "public"."federated_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_model1_id_ifc_models_id_fk" FOREIGN KEY ("model1_id") REFERENCES "public"."ifc_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_model2_id_ifc_models_id_fk" FOREIGN KEY ("model2_id") REFERENCES "public"."ifc_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clash_detections" ADD CONSTRAINT "clash_detections_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federated_models" ADD CONSTRAINT "federated_models_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ifc_models" ADD CONSTRAINT "ifc_models_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ifc_models" ADD CONSTRAINT "ifc_models_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ifc_models" ADD CONSTRAINT "ifc_models_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_elements" ADD CONSTRAINT "model_elements_ifc_model_id_ifc_models_id_fk" FOREIGN KEY ("ifc_model_id") REFERENCES "public"."ifc_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("company_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ar_markers" ADD CONSTRAINT "ar_markers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_sessions" ADD CONSTRAINT "collaboration_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_anchors" ADD CONSTRAINT "spatial_anchors_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spatial_anchors" ADD CONSTRAINT "spatial_anchors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vr_sessions" ADD CONSTRAINT "vr_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vr_sessions" ADD CONSTRAINT "vr_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bim_schedules" ADD CONSTRAINT "bim_schedules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bim_schedules" ADD CONSTRAINT "bim_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_tasks" ADD CONSTRAINT "schedule_tasks_schedule_id_bim_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."bim_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_actions" ADD CONSTRAINT "meeting_actions_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_actions" ADD CONSTRAINT "meeting_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_chat_messages" ADD CONSTRAINT "meeting_chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_collaboration_snapshots" ADD CONSTRAINT "meeting_collaboration_snapshots_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_collaboration_snapshots" ADD CONSTRAINT "meeting_collaboration_snapshots_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_collaboration_updates" ADD CONSTRAINT "meeting_collaboration_updates_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_collaboration_updates" ADD CONSTRAINT "meeting_collaboration_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_collaboration_updates" ADD CONSTRAINT "meeting_collaboration_updates_participant_id_meeting_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."meeting_participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_recordings" ADD CONSTRAINT "meeting_recordings_room_id_virtual_meeting_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."virtual_meeting_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_meeting_rooms" ADD CONSTRAINT "virtual_meeting_rooms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_meeting_rooms" ADD CONSTRAINT "virtual_meeting_rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_cost_items" ADD CONSTRAINT "budget_cost_items_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_tenant_id_tenants_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presence" ADD CONSTRAINT "presence_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_billing_usage" ADD CONSTRAINT "session_billing_usage_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_billing_usage" ADD CONSTRAINT "session_billing_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_actor_id_participants_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_recordings" ADD CONSTRAINT "session_recordings_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_company_id_idx" ON "companies" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "companies_tenant_id_idx" ON "companies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "task_element_links_task_id_idx" ON "task_element_links" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_element_links_element_id_idx" ON "task_element_links" USING btree ("element_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_tenant_id_idx" ON "tenants" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "timeline_simulations_schedule_id_idx" ON "timeline_simulations" USING btree ("schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_tenant_id_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "users_tenant_id_active_idx" ON "users" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "users_company_id_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_last_login_at_idx" ON "users" USING btree ("last_login_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "users_email_verified_idx" ON "users" USING btree ("email_verified");--> statement-breakpoint
CREATE INDEX "users_two_factor_enabled_idx" ON "users" USING btree ("two_factor_enabled");--> statement-breakpoint
CREATE INDEX "users_auth_idx" ON "users" USING btree ("tenant_id","email","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_subscriptions_company_event_url_idx" ON "webhook_subscriptions" USING btree ("company_id","event_type","url");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_tenant_id_idx" ON "webhook_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_company_id_idx" ON "webhook_subscriptions" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_rate_limits_identifier_endpoint_window_idx" ON "api_rate_limits" USING btree ("identifier","endpoint","window_start");--> statement-breakpoint
CREATE INDEX "api_rate_limits_tenant_id_idx" ON "api_rate_limits" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_rate_limits_window_end_idx" ON "api_rate_limits" USING btree ("window_end");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs" USING btree ("tenant_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs" USING btree ("user_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_action_timestamp_idx" ON "audit_logs" USING btree ("action","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_resource_timestamp_idx" ON "audit_logs" USING btree ("resource","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "auth_tokens_token_idx" ON "auth_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_id_token_type_idx" ON "auth_tokens" USING btree ("user_id","token_type");--> statement-breakpoint
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_tokens_is_used_idx" ON "auth_tokens" USING btree ("is_used");--> statement-breakpoint
CREATE INDEX "error_logs_tenant_id_timestamp_idx" ON "error_logs" USING btree ("tenant_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_logs_error_code_timestamp_idx" ON "error_logs" USING btree ("error_code","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_logs_severity_timestamp_idx" ON "error_logs" USING btree ("severity","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "error_logs_resolved_idx" ON "error_logs" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "error_logs_timestamp_idx" ON "error_logs" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "metrics_tenant_metric_timestamp_idx" ON "metrics" USING btree ("tenant_id","metric_name","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "metrics_metric_name_timestamp_idx" ON "metrics" USING btree ("metric_name","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "metrics_timestamp_idx" ON "metrics" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "metrics_tenant_metric_type_idx" ON "metrics" USING btree ("tenant_id","metric_name","metric_type");--> statement-breakpoint
CREATE INDEX "performance_metrics_operation_timestamp_idx" ON "performance_metrics" USING btree ("operation","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "performance_metrics_tenant_id_timestamp_idx" ON "performance_metrics" USING btree ("tenant_id","timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "performance_metrics_duration_idx" ON "performance_metrics" USING btree ("duration" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "performance_metrics_timestamp_idx" ON "performance_metrics" USING btree ("timestamp" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_preferences_tenant_id_idx" ON "user_preferences" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_tenant_id_idx" ON "user_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sessions_refresh_token_idx" ON "user_sessions" USING btree ("refresh_token");--> statement-breakpoint
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_sessions_user_active_idx" ON "user_sessions" USING btree ("user_id","is_revoked","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_is_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_keys_key_prefix_idx" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "webauthn_credential_id_idx" ON "webauthn_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "webauthn_user_id_idx" ON "webauthn_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "webauthn_tenant_id_idx" ON "webauthn_credentials" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "webauthn_is_active_idx" ON "webauthn_credentials" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "notification_prefs_user_id_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_prefs_tenant_id_idx" ON "notification_preferences" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notification_prefs_type_idx" ON "notification_preferences" USING btree ("notification_type");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_tenant_id_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_tenant_id_idx" ON "billing_checkout_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_status_idx" ON "billing_checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_checkout_sessions_provider_session_idx" ON "billing_checkout_sessions" USING btree ("provider_session_id");--> statement-breakpoint
CREATE INDEX "billing_invoices_tenant_id_idx" ON "billing_invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_invoices_subscription_id_idx" ON "billing_invoices" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_invoices_status_idx" ON "billing_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_payments_tenant_id_idx" ON "billing_payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_payments_subscription_id_idx" ON "billing_payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_payments_invoice_id_idx" ON "billing_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "billing_payments_status_idx" ON "billing_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_payments_provider_invoice_id_idx" ON "billing_payments" USING btree ("provider_invoice_id");--> statement-breakpoint
CREATE INDEX "billing_payments_provider_payment_intent_id_idx" ON "billing_payments" USING btree ("provider_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_subscriptions_tenant_id_unique_idx" ON "billing_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_tenant_id_idx" ON "billing_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_status_idx" ON "billing_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_provider_subscription_idx" ON "billing_subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "billing_usage_events_tenant_metric_idx" ON "billing_usage_events" USING btree ("tenant_id","metric");--> statement-breakpoint
CREATE INDEX "billing_usage_events_recorded_at_idx" ON "billing_usage_events" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_events_event_id_unique_idx" ON "stripe_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "stripe_events_tenant_id_idx" ON "stripe_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stripe_events_event_type_idx" ON "stripe_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "stripe_events_status_idx" ON "stripe_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stripe_events_processed_at_idx" ON "stripe_events" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "stripe_events_next_retry_at_idx" ON "stripe_events" USING btree ("next_retry_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_entitlements_tenant_id_key_unique_idx" ON "tenant_entitlements" USING btree ("tenant_id","entitlement_key");--> statement-breakpoint
CREATE INDEX "tenant_entitlements_tenant_id_idx" ON "tenant_entitlements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_entitlements_entitlement_key_idx" ON "tenant_entitlements" USING btree ("entitlement_key");--> statement-breakpoint
CREATE INDEX "tenant_entitlements_source_idx" ON "tenant_entitlements" USING btree ("source");--> statement-breakpoint
CREATE INDEX "tenant_entitlements_effective_until_idx" ON "tenant_entitlements" USING btree ("effective_until");--> statement-breakpoint
CREATE INDEX "clash_detections_project_id_idx" ON "clash_detections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "clash_detections_tenant_id_idx" ON "clash_detections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "clash_detections_status_idx" ON "clash_detections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "clash_detections_severity_idx" ON "clash_detections" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "clash_detections_scan_run_id_idx" ON "clash_detections" USING btree ("scan_run_id");--> statement-breakpoint
CREATE INDEX "federated_models_project_id_idx" ON "federated_models" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ifc_models_project_id_idx" ON "ifc_models" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "ifc_models_tenant_id_idx" ON "ifc_models" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ifc_models_discipline_idx" ON "ifc_models" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "ifc_models_phase_idx" ON "ifc_models" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "model_elements_ifc_model_id_idx" ON "model_elements" USING btree ("ifc_model_id");--> statement-breakpoint
CREATE INDEX "model_elements_express_id_idx" ON "model_elements" USING btree ("express_id");--> statement-breakpoint
CREATE INDEX "model_elements_type_idx" ON "model_elements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "projects_tenant_id_idx" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "projects_company_id_idx" ON "projects" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "scenarios_tenant_id_idx" ON "scenarios" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scenarios_project_id_idx" ON "scenarios" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scenarios_created_by_idx" ON "scenarios" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "scenarios_preset_id_idx" ON "scenarios" USING btree ("preset_id");--> statement-breakpoint
CREATE INDEX "scenarios_tenant_project_updated_idx" ON "scenarios" USING btree ("tenant_id","project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "annotations_project_id_idx" ON "annotations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "annotations_created_by_idx" ON "annotations" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "ar_markers_project_id_idx" ON "ar_markers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "collaboration_sessions_project_id_idx" ON "collaboration_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "spatial_anchors_project_id_idx" ON "spatial_anchors" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vr_sessions_project_id_idx" ON "vr_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vr_sessions_user_id_idx" ON "vr_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bim_schedules_project_id_idx" ON "bim_schedules" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "schedule_tasks_schedule_id_idx" ON "schedule_tasks" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "meeting_actions_room_id_idx" ON "meeting_actions" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "meeting_chat_messages_room_id_idx" ON "meeting_chat_messages" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_collaboration_snapshots_room_id_uidx" ON "meeting_collaboration_snapshots" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "meeting_collaboration_snapshots_room_id_idx" ON "meeting_collaboration_snapshots" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "meeting_collaboration_updates_room_version_uidx" ON "meeting_collaboration_updates" USING btree ("room_id","version");--> statement-breakpoint
CREATE INDEX "meeting_collaboration_updates_room_id_idx" ON "meeting_collaboration_updates" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "meeting_collaboration_updates_room_version_idx" ON "meeting_collaboration_updates" USING btree ("room_id","version");--> statement-breakpoint
CREATE INDEX "meeting_collaboration_updates_created_at_idx" ON "meeting_collaboration_updates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "meeting_participants_room_id_idx" ON "meeting_participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "meeting_participants_user_id_idx" ON "meeting_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meeting_recordings_room_id_idx" ON "meeting_recordings" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "virtual_meeting_rooms_project_id_idx" ON "virtual_meeting_rooms" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "virtual_meeting_rooms_created_by_idx" ON "virtual_meeting_rooms" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "budget_cost_items_budget_id_idx" ON "budget_cost_items" USING btree ("budget_id");--> statement-breakpoint
CREATE INDEX "budget_cost_items_budget_position_idx" ON "budget_cost_items" USING btree ("budget_id","position");--> statement-breakpoint
CREATE INDEX "budgets_tenant_id_idx" ON "budgets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "budgets_project_id_idx" ON "budgets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "budgets_created_by_idx" ON "budgets" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "budgets_tenant_project_updated_idx" ON "budgets" USING btree ("tenant_id","project_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "email_queue_status_idx" ON "email_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_queue_scheduled_at_idx" ON "email_queue" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "password_history_user_id_idx" ON "password_history" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "participants_session_id_idx" ON "participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "participants_user_id_idx" ON "participants" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_session_user_uidx" ON "participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "presence_participant_id_idx" ON "presence" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "presence_status_idx" ON "presence" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_billing_usage_session_id_idx" ON "session_billing_usage" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_billing_usage_project_id_idx" ON "session_billing_usage" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "session_events_session_id_idx" ON "session_events" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_events_session_sequence_uidx" ON "session_events" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "session_events_type_idx" ON "session_events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "session_events_created_at_idx" ON "session_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "session_recordings_session_id_idx" ON "session_recordings" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_project_id_idx" ON "sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "sessions_host_id_idx" ON "sessions" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_invite_token_uidx" ON "sessions" USING btree ("invite_token");