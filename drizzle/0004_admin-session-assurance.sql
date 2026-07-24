CREATE TABLE "auth"."admin_session_security" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"step_up_verified_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth"."admin_session_security" ADD CONSTRAINT "admin_session_security_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."admin_session_security" ADD CONSTRAINT "admin_session_security_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_session_security_user_idx" ON "auth"."admin_session_security" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_session_security_last_seen_idx" ON "auth"."admin_session_security" USING btree ("last_seen_at");--> statement-breakpoint
REVOKE ALL PRIVILEGES ON auth.admin_session_security FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON auth.admin_session_security
  TO shapewebs_admin_runtime;
