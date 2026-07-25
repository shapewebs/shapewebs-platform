CREATE TABLE "auth"."admin_totp_security" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_accepted_counter" bigint,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."admin_totp_security" ADD CONSTRAINT "admin_totp_security_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_totp_security_locked_idx" ON "auth"."admin_totp_security" USING btree ("locked_until");--> statement-breakpoint
REVOKE ALL PRIVILEGES ON auth.admin_totp_security FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE
  ON auth.admin_totp_security
  TO shapewebs_admin_runtime;
