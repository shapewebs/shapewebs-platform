DROP INDEX "app"."content_documents_publication_idx";--> statement-breakpoint
ALTER TABLE "app"."content_documents"
  ADD COLUMN "default_locale" text DEFAULT 'en' NOT NULL,
  ADD COLUMN "page_kind" text,
  ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."content_revisions"
  ADD COLUMN "command_id" uuid,
  ADD COLUMN "status" "app"."content_status" DEFAULT 'draft' NOT NULL,
  ADD COLUMN "slug" text,
  ADD COLUMN "page_kind" text,
  ADD COLUMN "change_note" text;--> statement-breakpoint
UPDATE "app"."content_revisions" AS revision
SET
  "command_id" = revision."id",
  "status" = CASE
    WHEN revision."published_at" IS NOT NULL THEN 'published'::"app"."content_status"
    ELSE document."status"
  END,
  "slug" = document."slug",
  "page_kind" = CASE
    WHEN document."kind" = 'page'::"app"."content_kind" THEN 'standard'
    ELSE NULL
  END
FROM "app"."content_documents" AS document
WHERE document."id" = revision."document_id";--> statement-breakpoint
ALTER TABLE "app"."content_revisions"
  ALTER COLUMN "command_id" SET NOT NULL,
  ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE TABLE "app"."content_localizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "document_id" uuid NOT NULL,
  "kind" "app"."content_kind" NOT NULL,
  "locale" text NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "published_revision_id" uuid,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "content_localizations_locale_supported"
    CHECK ("locale" IN ('en', 'da-DK')),
  CONSTRAINT "content_localizations_slug_format"
    CHECK (
      char_length("slug") BETWEEN 1 AND 180
      AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  CONSTRAINT "content_localizations_title_bounded"
    CHECK (char_length("title") BETWEEN 1 AND 140),
  CONSTRAINT "content_localizations_summary_bounded"
    CHECK ("summary" IS NULL OR char_length("summary") <= 320),
  CONSTRAINT "content_localizations_seo_object"
    CHECK (jsonb_typeof("seo") = 'object'),
  CONSTRAINT "content_localizations_publication_consistent"
    CHECK (
      (
        "published_revision_id" IS NULL
        AND "published_at" IS NULL
      )
      OR (
        "published_revision_id" IS NOT NULL
        AND "published_at" IS NOT NULL
      )
    )
);--> statement-breakpoint
INSERT INTO "app"."content_localizations" (
  "organization_id",
  "document_id",
  "kind",
  "locale",
  "slug",
  "title",
  "summary",
  "seo",
  "published_revision_id",
  "published_at",
  "created_at",
  "updated_at"
)
SELECT
  document."organization_id",
  latest_revision."document_id",
  document."kind",
  latest_revision."locale",
  latest_revision."slug",
  latest_revision."title",
  latest_revision."summary",
  latest_revision."seo",
  published_revision."id",
  published_revision."published_at",
  latest_revision."created_at",
  document."updated_at"
FROM (
  SELECT DISTINCT ON (revision."document_id", revision."locale")
    revision."document_id",
    revision."locale",
    revision."slug",
    revision."title",
    revision."summary",
    revision."seo",
    revision."created_at"
  FROM "app"."content_revisions" AS revision
  ORDER BY
    revision."document_id",
    revision."locale",
    revision."revision_number" DESC,
    revision."created_at" DESC
) AS latest_revision
INNER JOIN "app"."content_documents" AS document
  ON document."id" = latest_revision."document_id"
LEFT JOIN LATERAL (
  SELECT
    revision."id",
    revision."published_at"
  FROM "app"."content_revisions" AS revision
  WHERE revision."document_id" = latest_revision."document_id"
    AND revision."locale" = latest_revision."locale"
    AND revision."published_at" IS NOT NULL
    AND document."status" = 'published'::"app"."content_status"
    AND document."published_at" IS NOT NULL
  ORDER BY
    revision."published_at" DESC,
    revision."revision_number" DESC,
    revision."created_at" DESC
  LIMIT 1
) AS published_revision ON true;--> statement-breakpoint
ALTER TABLE "app"."content_localizations"
  ADD CONSTRAINT "content_localizations_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id")
  REFERENCES "app"."organizations"("id")
  ON DELETE cascade
  ON UPDATE no action,
  ADD CONSTRAINT "content_localizations_document_id_content_documents_id_fk"
  FOREIGN KEY ("document_id")
  REFERENCES "app"."content_documents"("id")
  ON DELETE cascade
  ON UPDATE no action,
  ADD CONSTRAINT "content_localizations_published_revision_id_content_revisions_id_fk"
  FOREIGN KEY ("published_revision_id")
  REFERENCES "app"."content_revisions"("id")
  ON DELETE restrict
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_documents"
  ADD CONSTRAINT "content_documents_default_locale_supported"
  CHECK ("default_locale" IN ('en', 'da-DK')),
  ADD CONSTRAINT "content_documents_page_kind_bounded"
  CHECK (
    "page_kind" IS NULL
    OR (
      char_length("page_kind") BETWEEN 1 AND 80
      AND "page_kind" ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
    )
  ),
  ADD CONSTRAINT "content_documents_version_positive"
  CHECK ("version" > 0);--> statement-breakpoint
ALTER TABLE "app"."content_revisions"
  ADD CONSTRAINT "content_revisions_locale_supported"
  CHECK ("locale" IN ('en', 'da-DK')),
  ADD CONSTRAINT "content_revisions_slug_format"
  CHECK (
    char_length("slug") BETWEEN 1 AND 180
    AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  ADD CONSTRAINT "content_revisions_page_kind_bounded"
  CHECK (
    "page_kind" IS NULL
    OR (
      char_length("page_kind") BETWEEN 1 AND 80
      AND "page_kind" ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
    )
  ),
  ADD CONSTRAINT "content_revisions_title_bounded"
  CHECK (char_length("title") BETWEEN 1 AND 140),
  ADD CONSTRAINT "content_revisions_summary_bounded"
  CHECK ("summary" IS NULL OR char_length("summary") <= 320),
  ADD CONSTRAINT "content_revisions_payload_object"
  CHECK (jsonb_typeof("payload") = 'object'),
  ADD CONSTRAINT "content_revisions_seo_object"
  CHECK (jsonb_typeof("seo") = 'object'),
  ADD CONSTRAINT "content_revisions_change_note_bounded"
  CHECK ("change_note" IS NULL OR char_length("change_note") <= 240);--> statement-breakpoint
CREATE UNIQUE INDEX "content_localizations_document_locale_unique"
  ON "app"."content_localizations" USING btree ("document_id", "locale");--> statement-breakpoint
CREATE UNIQUE INDEX "content_localizations_organization_kind_locale_slug_unique"
  ON "app"."content_localizations"
  USING btree ("organization_id", "kind", "locale", "slug");--> statement-breakpoint
CREATE INDEX "content_localizations_document_updated_idx"
  ON "app"."content_localizations" USING btree ("document_id", "updated_at");--> statement-breakpoint
CREATE INDEX "content_localizations_publication_idx"
  ON "app"."content_localizations"
  USING btree ("published_revision_id", "published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_command_unique"
  ON "app"."content_revisions" USING btree ("command_id");--> statement-breakpoint
CREATE INDEX "content_documents_publication_idx"
  ON "app"."content_documents"
  USING btree ("status", "published_at");--> statement-breakpoint
ALTER TABLE "app"."content_localizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."content_localizations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admins read localizations in current organization"
  ON "app"."content_localizations"
  AS PERMISSIVE
  FOR SELECT
  TO "shapewebs_admin_runtime"
  USING (
    "organization_id" =
      nullif(current_setting('app.organization_id', true), '')::uuid
    AND nullif(current_setting('app.membership_role', true), '')
      IN ('owner', 'editor')
  );--> statement-breakpoint
CREATE POLICY "editors manage localizations in current organization"
  ON "app"."content_localizations"
  AS PERMISSIVE
  FOR ALL
  TO "shapewebs_admin_runtime"
  USING (
    "organization_id" =
      nullif(current_setting('app.organization_id', true), '')::uuid
    AND nullif(current_setting('app.membership_role', true), '')
      IN ('owner', 'editor')
  )
  WITH CHECK (
    "organization_id" =
      nullif(current_setting('app.organization_id', true), '')::uuid
    AND nullif(current_setting('app.membership_role', true), '')
      IN ('owner', 'editor')
    AND EXISTS (
      SELECT 1
      FROM "app"."content_documents" AS document
      WHERE document."id" = "content_localizations"."document_id"
        AND document."organization_id" =
          "content_localizations"."organization_id"
        AND document."kind" = "content_localizations"."kind"
    )
    AND (
      (
        "content_localizations"."published_revision_id" IS NULL
        AND "content_localizations"."published_at" IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM "app"."content_revisions" AS revision
        WHERE revision."id" =
          "content_localizations"."published_revision_id"
          AND revision."document_id" =
            "content_localizations"."document_id"
          AND revision."locale" = "content_localizations"."locale"
          AND revision."published_at" IS NOT NULL
      )
    )
  );--> statement-breakpoint
CREATE POLICY "public reader reads published localization pointers"
  ON "app"."content_localizations"
  AS PERMISSIVE
  FOR SELECT
  TO "shapewebs_public_reader"
  USING (
    "published_revision_id" IS NOT NULL
    AND "published_at" IS NOT NULL
  );--> statement-breakpoint
CREATE POLICY "web runtime reads published localization pointers"
  ON "app"."content_localizations"
  AS PERMISSIVE
  FOR SELECT
  TO "shapewebs_web_runtime"
  USING (
    "published_revision_id" IS NOT NULL
    AND "published_at" IS NOT NULL
  );--> statement-breakpoint
ALTER POLICY "public reader reads published content"
  ON "app"."content_documents"
  TO "shapewebs_public_reader"
  USING (
    EXISTS (
      SELECT 1
      FROM "app"."content_localizations" AS localization
      WHERE localization."document_id" = "content_documents"."id"
        AND localization."published_revision_id" IS NOT NULL
        AND localization."published_at" IS NOT NULL
    )
  );--> statement-breakpoint
ALTER POLICY "web runtime reads published content"
  ON "app"."content_documents"
  TO "shapewebs_web_runtime"
  USING (
    EXISTS (
      SELECT 1
      FROM "app"."content_localizations" AS localization
      WHERE localization."document_id" = "content_documents"."id"
        AND localization."published_revision_id" IS NOT NULL
        AND localization."published_at" IS NOT NULL
    )
  );--> statement-breakpoint
ALTER POLICY "public reader reads published revisions"
  ON "app"."content_revisions"
  TO "shapewebs_public_reader"
  USING (
    "published_at" IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "app"."content_localizations" AS localization
      WHERE localization."document_id" = "content_revisions"."document_id"
        AND localization."locale" = "content_revisions"."locale"
        AND localization."published_revision_id" = "content_revisions"."id"
        AND localization."published_at" IS NOT NULL
    )
  );--> statement-breakpoint
ALTER POLICY "web runtime reads published revisions"
  ON "app"."content_revisions"
  TO "shapewebs_web_runtime"
  USING (
    "published_at" IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "app"."content_localizations" AS localization
      WHERE localization."document_id" = "content_revisions"."document_id"
        AND localization."locale" = "content_revisions"."locale"
        AND localization."published_revision_id" = "content_revisions"."id"
        AND localization."published_at" IS NOT NULL
    )
  );--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON TABLE "app"."content_localizations"
  FROM PUBLIC;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE "app"."content_localizations"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
REVOKE SELECT
  ON TABLE "app"."content_documents"
  FROM "shapewebs_public_reader", "shapewebs_web_runtime";--> statement-breakpoint
GRANT SELECT (
  "id",
  "organization_id",
  "kind",
  "published_at"
)
  ON TABLE "app"."content_documents"
  TO "shapewebs_public_reader", "shapewebs_web_runtime";--> statement-breakpoint
GRANT SELECT (
  "id",
  "document_id",
  "locale",
  "published_revision_id",
  "published_at"
)
  ON TABLE "app"."content_localizations"
  TO "shapewebs_public_reader", "shapewebs_web_runtime";
