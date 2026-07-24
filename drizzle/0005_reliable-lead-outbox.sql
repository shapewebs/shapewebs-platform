CREATE TYPE "app"."outbox_status" AS ENUM('pending', 'processing', 'sent', 'permanent_failure');--> statement-breakpoint
CREATE TABLE "app"."outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "app"."outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"provider_message_id" text,
	"delivery_status" text,
	"delivery_occurred_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "outbox_events_attempts_nonnegative" CHECK ("app"."outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "app"."outbox_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."provider_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_message_id" text,
	"body_hash" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."provider_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ADD COLUMN "command_id" uuid;--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ADD COLUMN "request_fingerprint" text;--> statement-breakpoint
UPDATE app.lead_submissions
SET
  command_id = id,
  request_fingerprint = 'legacy:' || id::text
WHERE command_id IS NULL OR request_fingerprint IS NULL;--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ALTER COLUMN "command_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ALTER COLUMN "request_fingerprint" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."outbox_events" ADD CONSTRAINT "outbox_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."outbox_events" ADD CONSTRAINT "outbox_events_lead_id_lead_submissions_id_fk" FOREIGN KEY ("lead_id") REFERENCES "app"."lead_submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."provider_webhook_events" ADD CONSTRAINT "provider_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_idempotency_unique" ON "app"."outbox_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "app"."outbox_events" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_organization_created_idx" ON "app"."outbox_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_provider_message_idx" ON "app"."outbox_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "provider_webhook_message_occurred_idx" ON "app"."provider_webhook_events" USING btree ("provider_message_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "lead_submissions_command_unique" ON "app"."lead_submissions" USING btree ("command_id");--> statement-breakpoint
CREATE POLICY "web runtime reads its lead receipts" ON "app"."lead_submissions" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "admins manage outbox in current organization" ON "app"."outbox_events" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."outbox_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."outbox_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "web runtime inserts lead outbox events" ON "app"."outbox_events" AS PERMISSIVE FOR INSERT TO "shapewebs_web_runtime" WITH CHECK ("app"."outbox_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."outbox_events"."event_type" = 'lead.notification.requested'
        and exists (
          select 1
          from "app"."lead_submissions"
          where "app"."lead_submissions"."id" = "app"."outbox_events"."lead_id"
            and "app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        ));--> statement-breakpoint
CREATE POLICY "admins read provider webhook events" ON "app"."provider_webhook_events" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."provider_webhook_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "admin runtime inserts provider webhook events" ON "app"."provider_webhook_events" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."provider_webhook_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."provider_webhook_events"."provider" = 'resend');--> statement-breakpoint
ALTER TABLE app.outbox_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app.provider_webhook_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON app.outbox_events, app.provider_webhook_events FROM PUBLIC;--> statement-breakpoint
REVOKE USAGE ON TYPE app.outbox_status FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON TYPE app.outbox_status TO
  shapewebs_admin_runtime,
  shapewebs_web_runtime;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON app.outbox_events
  TO shapewebs_admin_runtime;--> statement-breakpoint
GRANT SELECT, INSERT
  ON app.provider_webhook_events
  TO shapewebs_admin_runtime;--> statement-breakpoint
GRANT INSERT
  ON app.outbox_events
  TO shapewebs_web_runtime;--> statement-breakpoint
GRANT SELECT (id, command_id, organization_id, request_fingerprint)
  ON app.lead_submissions
  TO shapewebs_web_runtime;
