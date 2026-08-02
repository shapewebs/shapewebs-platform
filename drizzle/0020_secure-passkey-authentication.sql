CREATE TABLE "auth"."passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
ALTER TABLE "auth"."passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "auth"."passkey" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "passkey_credentialID_unique" ON "auth"."passkey" USING btree ("credential_id");
--> statement-breakpoint
ALTER TABLE auth.passkey
  ADD CONSTRAINT passkey_name_bounded
    CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT passkey_public_key_bounded
    CHECK (char_length(public_key) BETWEEN 16 AND 8192),
  ADD CONSTRAINT passkey_credential_id_bounded
    CHECK (char_length(credential_id) BETWEEN 16 AND 2048),
  ADD CONSTRAINT passkey_counter_nonnegative
    CHECK (counter >= 0),
  ADD CONSTRAINT passkey_device_type_valid
    CHECK (device_type IN ('singleDevice', 'multiDevice')),
  ADD CONSTRAINT passkey_transports_bounded
    CHECK (transports IS NULL OR char_length(transports) <= 512),
  ADD CONSTRAINT passkey_aaguid_valid
    CHECK (
      aaguid IS NULL
      OR aaguid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    );
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON auth.passkey
  FROM PUBLIC, shapewebs_web_runtime, shapewebs_public_reader,
  shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON auth.passkey
  TO shapewebs_admin_runtime;
