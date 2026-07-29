CREATE TABLE "app"."content_provider_commands" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"provider" text DEFAULT 'sanity' NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"provider_transaction_id" text,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "content_provider_commands_provider_valid" CHECK ("app"."content_provider_commands"."provider" = 'sanity'),
	CONSTRAINT "content_provider_commands_action_valid" CHECK ("app"."content_provider_commands"."action" in (
        'blog_post.create',
        'blog_post.save',
        'blog_post.publish',
        'blog_post.unpublish'
      )),
	CONSTRAINT "content_provider_commands_target_bounded" CHECK (char_length("app"."content_provider_commands"."target_id") between 1 and 160
        and "app"."content_provider_commands"."target_id" !~ '[[:cntrl:][:space:]]'),
	CONSTRAINT "content_provider_commands_fingerprint_format" CHECK ("app"."content_provider_commands"."request_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "content_provider_commands_status_valid" CHECK ("app"."content_provider_commands"."status" in ('reserved', 'succeeded', 'uncertain')),
	CONSTRAINT "content_provider_commands_transaction_bounded" CHECK ("app"."content_provider_commands"."provider_transaction_id" is null
        or (
          char_length("app"."content_provider_commands"."provider_transaction_id") between 1 and 160
          and "app"."content_provider_commands"."provider_transaction_id" !~ '[[:cntrl:][:space:]]'
        )),
	CONSTRAINT "content_provider_commands_failure_code_bounded" CHECK ("app"."content_provider_commands"."failure_code" is null
        or (
          char_length("app"."content_provider_commands"."failure_code") between 3 and 80
          and "app"."content_provider_commands"."failure_code" ~ '^[a-z0-9_]+$'
        )),
	CONSTRAINT "content_provider_commands_state_consistent" CHECK ((
        "app"."content_provider_commands"."status" = 'reserved'
        and "app"."content_provider_commands"."provider_transaction_id" is null
        and "app"."content_provider_commands"."failure_code" is null
        and "app"."content_provider_commands"."completed_at" is null
      ) or (
        "app"."content_provider_commands"."status" = 'succeeded'
        and "app"."content_provider_commands"."provider_transaction_id" is not null
        and "app"."content_provider_commands"."failure_code" is null
        and "app"."content_provider_commands"."completed_at" is not null
      ) or (
        "app"."content_provider_commands"."status" = 'uncertain'
        and "app"."content_provider_commands"."provider_transaction_id" is null
        and "app"."content_provider_commands"."failure_code" is not null
        and "app"."content_provider_commands"."completed_at" is null
      ))
);
--> statement-breakpoint
ALTER TABLE "app"."content_provider_commands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."sanity_content_preview_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"locale" text NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"token_hash" text NOT NULL,
	"session_token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sanity_preview_grants_document_id_safe" CHECK (char_length("app"."sanity_content_preview_grants"."document_id") between 1 and 160
        and "app"."sanity_content_preview_grants"."document_id" ~ '^[A-Za-z0-9_-]+([.][A-Za-z0-9_-]+)*$'
        and "app"."sanity_content_preview_grants"."document_id" not like 'drafts.%'
        and "app"."sanity_content_preview_grants"."document_id" not like 'versions.%'
        and strpos("app"."sanity_content_preview_grants"."document_id", '..') = 0),
	CONSTRAINT "sanity_preview_grants_revision_id_safe" CHECK (char_length("app"."sanity_content_preview_grants"."revision_id") between 1 and 128
        and "app"."sanity_content_preview_grants"."revision_id" ~ '^[A-Za-z0-9_-]+$'),
	CONSTRAINT "sanity_preview_grants_locale_supported" CHECK ("app"."sanity_content_preview_grants"."locale" in ('en', 'da-DK')),
	CONSTRAINT "sanity_preview_grants_slug_format" CHECK (char_length("app"."sanity_content_preview_grants"."slug") between 1 and 120
        and "app"."sanity_content_preview_grants"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "sanity_preview_grants_path_safe" CHECK (char_length("app"."sanity_content_preview_grants"."path") between 1 and 240
        and left("app"."sanity_content_preview_grants"."path", 1) = '/'
        and left("app"."sanity_content_preview_grants"."path", 2) <> '//'
        and strpos("app"."sanity_content_preview_grants"."path", chr(92)) = 0
        and "app"."sanity_content_preview_grants"."path" !~ '[[:cntrl:]]'),
	CONSTRAINT "sanity_preview_grants_token_hash_format" CHECK ("app"."sanity_content_preview_grants"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sanity_preview_grants_session_token_hash_format" CHECK ("app"."sanity_content_preview_grants"."session_token_hash" is null
        or "app"."sanity_content_preview_grants"."session_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sanity_preview_grants_expiry_bounded" CHECK ("app"."sanity_content_preview_grants"."expires_at" > "app"."sanity_content_preview_grants"."created_at"
        and "app"."sanity_content_preview_grants"."expires_at" <= "app"."sanity_content_preview_grants"."created_at" + interval '30 minutes'),
	CONSTRAINT "sanity_preview_grants_consumption_bounded" CHECK ((
        "app"."sanity_content_preview_grants"."consumed_at" is null
        and "app"."sanity_content_preview_grants"."session_token_hash" is null
      ) or (
        "app"."sanity_content_preview_grants"."consumed_at" is not null
        and "app"."sanity_content_preview_grants"."session_token_hash" is not null
        and "app"."sanity_content_preview_grants"."consumed_at" >= "app"."sanity_content_preview_grants"."created_at"
        and "app"."sanity_content_preview_grants"."consumed_at" < "app"."sanity_content_preview_grants"."expires_at"
      ))
);
--> statement-breakpoint
ALTER TABLE "app"."sanity_content_preview_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."content_provider_commands" ADD CONSTRAINT "content_provider_commands_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_provider_commands" ADD CONSTRAINT "content_provider_commands_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sanity_content_preview_grants" ADD CONSTRAINT "sanity_content_preview_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."sanity_content_preview_grants" ADD CONSTRAINT "sanity_content_preview_grants_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_provider_commands_organization_created_idx" ON "app"."content_provider_commands" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "content_provider_commands_status_updated_idx" ON "app"."content_provider_commands" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sanity_preview_grants_token_hash_unique" ON "app"."sanity_content_preview_grants" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sanity_preview_grants_session_token_hash_unique" ON "app"."sanity_content_preview_grants" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "sanity_preview_grants_expiry_idx" ON "app"."sanity_content_preview_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sanity_preview_grants_document_revision_idx" ON "app"."sanity_content_preview_grants" USING btree ("document_id","revision_id");--> statement-breakpoint
CREATE POLICY "admins read content provider commands" ON "app"."content_provider_commands" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."content_provider_commands"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and (
          nullif(current_setting('app.membership_role', true), '') = 'owner'
          or (
            nullif(current_setting('app.membership_role', true), '') = 'editor'
            and "app"."content_provider_commands"."actor_user_id" = nullif(current_setting('app.user_id', true), '')
          )
        ));--> statement-breakpoint
CREATE POLICY "editors insert own content provider commands" ON "app"."content_provider_commands" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."content_provider_commands"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_provider_commands"."actor_user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors update own content provider commands" ON "app"."content_provider_commands" AS PERMISSIVE FOR UPDATE TO "shapewebs_admin_runtime" USING ("app"."content_provider_commands"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_provider_commands"."actor_user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."content_provider_commands"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_provider_commands"."actor_user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors create Sanity preview grants" ON "app"."sanity_content_preview_grants" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."created_by_user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and "app"."sanity_content_preview_grants"."consumed_at" is null
        and "app"."sanity_content_preview_grants"."session_token_hash" is null);--> statement-breakpoint
CREATE POLICY "web runtime reads exact Sanity preview grant" ON "app"."sanity_content_preview_grants" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."expires_at" > now()
        and (
          (
            "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."sanity_content_preview_grants"."consumed_at" is null
            and "app"."sanity_content_preview_grants"."created_at" > now() - interval '5 minutes'
          )
          or (
            "app"."sanity_content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."sanity_content_preview_grants"."consumed_at" is not null
          )
        ));--> statement-breakpoint
CREATE POLICY "web runtime consumes fresh Sanity preview grant" ON "app"."sanity_content_preview_grants" AS PERMISSIVE FOR UPDATE TO "shapewebs_web_runtime" USING ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."sanity_content_preview_grants"."consumed_at" is null
        and "app"."sanity_content_preview_grants"."expires_at" > now()
        and "app"."sanity_content_preview_grants"."created_at" > now() - interval '5 minutes') WITH CHECK ("app"."sanity_content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."sanity_content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."sanity_content_preview_grants"."consumed_at" is not null
        and "app"."sanity_content_preview_grants"."session_token_hash" is not null
        and "app"."sanity_content_preview_grants"."expires_at" > now());--> statement-breakpoint
ALTER POLICY "admin runtime inserts provider webhook events" ON "app"."provider_webhook_events" TO shapewebs_admin_runtime WITH CHECK ("app"."provider_webhook_events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."provider_webhook_events"."provider" in ('resend', 'sanity'));--> statement-breakpoint
ALTER POLICY "web runtime reads exact preview grant" ON "app"."content_preview_grants" TO shapewebs_web_runtime USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."expires_at" > now()
        and (
          (
            "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."consumed_at" is null
            and "app"."content_preview_grants"."created_at" > now() - interval '5 minutes'
          )
          or (
            "app"."content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."consumed_at" is not null
          )
        ));--> statement-breakpoint
ALTER TABLE "app"."content_provider_commands" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."sanity_content_preview_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON TABLE "app"."content_provider_commands",
    "app"."sanity_content_preview_grants"
  FROM PUBLIC, "shapewebs_admin_runtime", "shapewebs_web_runtime",
    "shapewebs_public_reader", "shapewebs_portal_runtime";--> statement-breakpoint
GRANT SELECT, INSERT
  ON TABLE "app"."content_provider_commands"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT UPDATE (
  "status",
  "provider_transaction_id",
  "failure_code",
  "updated_at",
  "completed_at"
)
  ON TABLE "app"."content_provider_commands"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT INSERT
  ON TABLE "app"."sanity_content_preview_grants"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT SELECT (
  "organization_id",
  "document_id",
  "revision_id",
  "locale",
  "slug",
  "path",
  "token_hash",
  "session_token_hash",
  "expires_at",
  "consumed_at",
  "created_at"
)
  ON TABLE "app"."sanity_content_preview_grants"
  TO "shapewebs_web_runtime";--> statement-breakpoint
GRANT UPDATE ("consumed_at", "session_token_hash")
  ON TABLE "app"."sanity_content_preview_grants"
  TO "shapewebs_web_runtime";
