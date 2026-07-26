CREATE TYPE "auth"."auth_email_kind" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TYPE "auth"."auth_email_status" AS ENUM('pending', 'processing', 'sent', 'permanent_failure');--> statement-breakpoint
CREATE TABLE "auth"."auth_email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"kind" "auth"."auth_email_kind" NOT NULL,
	"recipient" text NOT NULL,
	"token_hash" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "auth"."auth_email_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"provider_message_id" text,
	"last_error_code" text,
	"processed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_auth_email_attempts_nonnegative" CHECK ("auth"."auth_email_outbox"."attempts" >= 0),
	CONSTRAINT "admin_auth_email_recipient_normalized" CHECK ("auth"."auth_email_outbox"."recipient" = lower(btrim("auth"."auth_email_outbox"."recipient"))),
	CONSTRAINT "admin_auth_email_token_hash_format" CHECK ("auth"."auth_email_outbox"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox" ADD CONSTRAINT "auth_email_outbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox" ADD CONSTRAINT "auth_email_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_auth_email_token_hash_unique" ON "auth"."auth_email_outbox" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_auth_email_idempotency_unique" ON "auth"."auth_email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "admin_auth_email_delivery_idx" ON "auth"."auth_email_outbox" USING btree ("organization_id","status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "admin_auth_email_recipient_idx" ON "auth"."auth_email_outbox" USING btree ("organization_id","recipient","created_at");
--> statement-breakpoint
ALTER TABLE auth.auth_email_outbox
  ADD CONSTRAINT admin_auth_email_recipient_bounded
    CHECK (char_length(recipient) BETWEEN 3 AND 320),
  ADD CONSTRAINT admin_auth_email_encrypted_token_bounded
    CHECK (char_length(encrypted_token) BETWEEN 32 AND 8192),
  ADD CONSTRAINT admin_auth_email_idempotency_bounded
    CHECK (char_length(idempotency_key) BETWEEN 10 AND 200),
  ADD CONSTRAINT admin_auth_email_expiry_valid
    CHECK (expires_at > created_at);
--> statement-breakpoint
ALTER TABLE auth.auth_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.auth_email_outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY "admin runtime manages auth email in current organization"
  ON auth.auth_email_outbox
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_admin_runtime
  USING (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  )
  WITH CHECK (
    organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
  );
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON auth.auth_email_outbox
  FROM PUBLIC, shapewebs_web_runtime, shapewebs_public_reader,
  shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE
  ON auth.auth_email_outbox
  TO shapewebs_admin_runtime;
--> statement-breakpoint
REVOKE USAGE ON TYPE auth.auth_email_kind, auth.auth_email_status
  FROM PUBLIC, shapewebs_web_runtime, shapewebs_public_reader,
  shapewebs_portal_runtime;
--> statement-breakpoint
GRANT USAGE ON TYPE auth.auth_email_kind, auth.auth_email_status
  TO shapewebs_admin_runtime;
