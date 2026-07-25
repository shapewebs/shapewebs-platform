CREATE TABLE "app"."content_preview_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"path" text NOT NULL,
	"token_hash" text NOT NULL,
	"session_token_hash" text,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_preview_grants_locale_supported" CHECK ("app"."content_preview_grants"."locale" in ('en', 'da-DK')),
	CONSTRAINT "content_preview_grants_path_safe" CHECK (char_length("app"."content_preview_grants"."path") between 1 and 240
        and left("app"."content_preview_grants"."path", 1) = '/'
        and left("app"."content_preview_grants"."path", 2) <> '//'
        and strpos("app"."content_preview_grants"."path", chr(92)) = 0
        and "app"."content_preview_grants"."path" !~ '[[:cntrl:]]'),
	CONSTRAINT "content_preview_grants_token_hash_format" CHECK ("app"."content_preview_grants"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "content_preview_grants_session_token_hash_format" CHECK ("app"."content_preview_grants"."session_token_hash" is null or "app"."content_preview_grants"."session_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "content_preview_grants_expiry_bounded" CHECK ("app"."content_preview_grants"."expires_at" > "app"."content_preview_grants"."created_at"
        and "app"."content_preview_grants"."expires_at" <= "app"."content_preview_grants"."created_at" + interval '30 minutes'),
	CONSTRAINT "content_preview_grants_consumption_bounded" CHECK ((
        "app"."content_preview_grants"."consumed_at" is null
        and "app"."content_preview_grants"."session_token_hash" is null
      ) or (
        "app"."content_preview_grants"."consumed_at" is not null
        and "app"."content_preview_grants"."session_token_hash" is not null
        and "app"."content_preview_grants"."consumed_at" >= "app"."content_preview_grants"."created_at"
        and "app"."content_preview_grants"."consumed_at" < "app"."content_preview_grants"."expires_at"
      ))
);
--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" ADD CONSTRAINT "content_preview_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" ADD CONSTRAINT "content_preview_grants_document_id_content_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "app"."content_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" ADD CONSTRAINT "content_preview_grants_revision_id_content_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "app"."content_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_preview_grants" ADD CONSTRAINT "content_preview_grants_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_preview_grants_token_hash_unique" ON "app"."content_preview_grants" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "content_preview_grants_session_token_hash_unique" ON "app"."content_preview_grants" USING btree ("session_token_hash");--> statement-breakpoint
CREATE INDEX "content_preview_grants_expiry_idx" ON "app"."content_preview_grants" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "content_preview_grants_document_revision_idx" ON "app"."content_preview_grants" USING btree ("document_id","revision_id");--> statement-breakpoint
CREATE POLICY "editors create preview grants" ON "app"."content_preview_grants" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."created_by_user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and "app"."content_preview_grants"."consumed_at" is null
        and "app"."content_preview_grants"."session_token_hash" is null
        and exists (
          select 1
          from "app"."content_documents"
          where "app"."content_documents"."id" = "app"."content_preview_grants"."document_id"
            and "app"."content_documents"."organization_id" = "app"."content_preview_grants"."organization_id"
        )
        and exists (
          select 1
          from "app"."content_revisions"
          where "app"."content_revisions"."id" = "app"."content_preview_grants"."revision_id"
            and "app"."content_revisions"."document_id" = "app"."content_preview_grants"."document_id"
            and "app"."content_revisions"."locale" = "app"."content_preview_grants"."locale"
        ));--> statement-breakpoint
CREATE POLICY "editors read current organization preview grants" ON "app"."content_preview_grants" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "web runtime reads exact preview grant" ON "app"."content_preview_grants" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."expires_at" > now()
        and (
          (
            "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."created_at" > now() - interval '5 minutes'
          )
          or (
            "app"."content_preview_grants"."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
            and "app"."content_preview_grants"."consumed_at" is not null
          )
        ));--> statement-breakpoint
CREATE POLICY "web runtime consumes fresh preview grant" ON "app"."content_preview_grants" AS PERMISSIVE FOR UPDATE TO "shapewebs_web_runtime" USING ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."content_preview_grants"."consumed_at" is null
        and "app"."content_preview_grants"."expires_at" > now()
        and "app"."content_preview_grants"."created_at" > now() - interval '5 minutes') WITH CHECK ("app"."content_preview_grants"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_preview_grants"."token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
        and "app"."content_preview_grants"."consumed_at" is not null
        and "app"."content_preview_grants"."session_token_hash" is not null
        and "app"."content_preview_grants"."expires_at" > now());--> statement-breakpoint
ALTER POLICY "web runtime reads published content" ON "app"."content_documents" TO shapewebs_web_runtime USING ("app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and (
          exists (
            select 1
            from "app"."content_localizations" as localization
            where localization."document_id" = "app"."content_documents"."id"
              and localization."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
              and localization."published_revision_id" is not null
              and localization."published_at" is not null
          )
          or exists (
            select 1
            from "app"."content_preview_grants" as preview_grant
            where preview_grant."document_id" = "app"."content_documents"."id"
              and preview_grant."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
              and preview_grant."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
              and preview_grant."consumed_at" is not null
              and preview_grant."expires_at" > now()
          )
        ));--> statement-breakpoint
ALTER POLICY "web runtime reads published localization pointers" ON "app"."content_localizations" TO shapewebs_web_runtime USING ("app"."content_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."content_localizations"."published_revision_id" is not null
        and "app"."content_localizations"."published_at" is not null);--> statement-breakpoint
ALTER POLICY "web runtime reads published revisions" ON "app"."content_revisions" TO shapewebs_web_runtime USING ((
        "app"."content_revisions"."published_at" is not null
        and exists (
          select 1
          from "app"."content_localizations"
          where "app"."content_localizations"."document_id" = "app"."content_revisions"."document_id"
            and "app"."content_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
            and "app"."content_localizations"."locale" = "app"."content_revisions"."locale"
            and "app"."content_localizations"."published_revision_id" = "app"."content_revisions"."id"
            and "app"."content_localizations"."published_at" is not null
        )
      ) or exists (
        select 1
        from "app"."content_preview_grants" as preview_grant
        where preview_grant."revision_id" = "app"."content_revisions"."id"
          and preview_grant."document_id" = "app"."content_revisions"."document_id"
          and preview_grant."locale" = "app"."content_revisions"."locale"
          and preview_grant."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
          and preview_grant."session_token_hash" = nullif(current_setting('app.preview_token_hash', true), '')
          and preview_grant."consumed_at" is not null
          and preview_grant."expires_at" > now()
      ));--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON TABLE "app"."content_preview_grants"
  FROM PUBLIC,
    "shapewebs_public_reader",
    "shapewebs_web_runtime",
    "shapewebs_admin_runtime";--> statement-breakpoint
GRANT SELECT, INSERT
  ON TABLE "app"."content_preview_grants"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT SELECT (
  "organization_id",
  "document_id",
  "revision_id",
  "locale",
  "path",
  "token_hash",
  "session_token_hash",
  "expires_at",
  "consumed_at",
  "created_at"
)
  ON TABLE "app"."content_preview_grants"
  TO "shapewebs_web_runtime";--> statement-breakpoint
GRANT UPDATE ("consumed_at", "session_token_hash")
  ON TABLE "app"."content_preview_grants"
  TO "shapewebs_web_runtime";--> statement-breakpoint
GRANT SELECT ("organization_id")
  ON TABLE "app"."content_localizations"
  TO "shapewebs_web_runtime";
