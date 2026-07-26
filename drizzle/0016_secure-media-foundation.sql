CREATE TYPE "app"."media_file_status" AS ENUM('pending', 'ready', 'failed', 'cleanup_required');--> statement-breakpoint
CREATE TABLE "app"."file_localizations" (
	"organization_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"alt_text" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_localizations_file_locale_pk" PRIMARY KEY("file_id","locale"),
	CONSTRAINT "file_localizations_locale_supported" CHECK ("app"."file_localizations"."locale" in ('en', 'da-DK')),
	CONSTRAINT "file_localizations_alt_text_bounded" CHECK (char_length("app"."file_localizations"."alt_text") between 1 and 180),
	CONSTRAINT "file_localizations_caption_bounded" CHECK ("app"."file_localizations"."caption" is null or char_length("app"."file_localizations"."caption") <= 280)
);
--> statement-breakpoint
ALTER TABLE "app"."file_localizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "status" "app"."media_file_status" DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "storage_provider" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "store_id" text;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "storage_url" text;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "storage_etag" text;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "original_byte_size" integer;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "failure_code" text;--> statement-breakpoint
ALTER TABLE "app"."files" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "app"."file_localizations" ADD CONSTRAINT "file_localizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."file_localizations" ADD CONSTRAINT "file_localizations_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "app"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "file_localizations_organization_locale_idx" ON "app"."file_localizations" USING btree ("organization_id","locale");--> statement-breakpoint
CREATE INDEX "files_organization_status_created_idx" ON "app"."files" USING btree ("organization_id","status","created_at");--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_original_byte_size_positive" CHECK ("app"."files"."original_byte_size" is null or "app"."files"."original_byte_size" > 0);--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_storage_provider_valid" CHECK ("app"."files"."storage_provider" in ('legacy', 'vercel_blob'));--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_storage_key_bounded" CHECK (char_length("app"."files"."storage_key") between 1 and 512
        and "app"."files"."storage_key" !~ '[[:cntrl:]]'
        and "app"."files"."storage_key" not like '/%'
        and "app"."files"."storage_key" not like '%..%');--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_original_name_bounded" CHECK (char_length("app"."files"."original_name") between 1 and 180
        and "app"."files"."original_name" !~ '[[:cntrl:]/\\]');--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_mime_type_bounded" CHECK (char_length("app"."files"."mime_type") between 3 and 120);--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_image_dimensions_consistent" CHECK ((
        "app"."files"."width" is null
        and "app"."files"."height" is null
      ) or (
        "app"."files"."width" between 1 and 8192
        and "app"."files"."height" between 1 and 8192
      ));--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_sha256_format" CHECK ("app"."files"."sha256" is null or "app"."files"."sha256" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_failure_code_bounded" CHECK ("app"."files"."failure_code" is null
        or char_length("app"."files"."failure_code") between 3 and 80);--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_vercel_blob_state_consistent" CHECK ((
        "app"."files"."storage_provider" = 'legacy'
        and "app"."files"."status" = 'ready'
        and "app"."files"."store_id" is null
        and "app"."files"."storage_url" is null
        and "app"."files"."storage_etag" is null
        and "app"."files"."original_byte_size" is null
        and "app"."files"."sha256" is null
        and "app"."files"."width" is null
        and "app"."files"."height" is null
        and "app"."files"."failure_code" is null
      ) or (
        "app"."files"."storage_provider" = 'vercel_blob'
        and char_length("app"."files"."store_id") between 8 and 128
        and "app"."files"."store_id" !~ '[[:cntrl:][:space:]]'
        and "app"."files"."original_byte_size" is not null
        and "app"."files"."sha256" is not null
        and "app"."files"."width" is not null
        and "app"."files"."height" is not null
        and (
          (
            "app"."files"."status" in ('pending', 'failed')
            and "app"."files"."storage_url" is null
            and "app"."files"."storage_etag" is null
          ) or (
            "app"."files"."status" in ('ready', 'cleanup_required')
            and char_length("app"."files"."storage_url") between 20 and 2048
            and char_length("app"."files"."storage_etag") between 1 and 256
          )
        )
        and (
          (
            "app"."files"."status" in ('pending', 'ready')
            and "app"."files"."failure_code" is null
          ) or (
            "app"."files"."status" in ('failed', 'cleanup_required')
            and "app"."files"."failure_code" is not null
          )
        )
      ));--> statement-breakpoint
CREATE POLICY "editors update files in current organization" ON "app"."files" AS PERMISSIVE FOR UPDATE TO "shapewebs_admin_runtime" USING ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "web runtime reads ready public files" ON "app"."files" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."files"."visibility" = 'public'
        and "app"."files"."status" = 'ready');--> statement-breakpoint
CREATE POLICY "admins read file localizations in current organization" ON "app"."file_localizations" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."file_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors manage file localizations in current organization" ON "app"."file_localizations" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."file_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."file_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and exists (
          select 1
          from "app"."files"
          where "app"."files"."id" = "app"."file_localizations"."file_id"
            and "app"."files"."organization_id" = "app"."file_localizations"."organization_id"
        ));--> statement-breakpoint
CREATE POLICY "web runtime reads ready public file localizations" ON "app"."file_localizations" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."file_localizations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and exists (
          select 1
          from "app"."files"
          where "app"."files"."id" = "app"."file_localizations"."file_id"
            and "app"."files"."organization_id" = "app"."file_localizations"."organization_id"
            and "app"."files"."visibility" = 'public'
            and "app"."files"."status" = 'ready'
        ));--> statement-breakpoint
ALTER TABLE "app"."file_localizations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON TABLE "app"."file_localizations"
  FROM PUBLIC, "shapewebs_web_runtime", "shapewebs_public_reader",
    "shapewebs_portal_runtime";--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE "app"."file_localizations"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT SELECT (
  "file_id",
  "locale",
  "alt_text",
  "caption"
)
  ON TABLE "app"."file_localizations"
  TO "shapewebs_web_runtime";--> statement-breakpoint
GRANT UPDATE (
  "status",
  "visibility",
  "storage_url",
  "storage_etag",
  "failure_code",
  "updated_at"
)
  ON TABLE "app"."files"
  TO "shapewebs_admin_runtime";--> statement-breakpoint
GRANT SELECT (
  "id",
  "organization_id",
  "storage_key",
  "visibility",
  "status",
  "storage_url",
  "storage_etag",
  "mime_type",
  "byte_size",
  "sha256",
  "width",
  "height",
  "created_at"
)
  ON TABLE "app"."files"
  TO "shapewebs_web_runtime";--> statement-breakpoint
REVOKE USAGE
  ON TYPE "app"."media_file_status"
  FROM PUBLIC, "shapewebs_web_runtime", "shapewebs_public_reader",
    "shapewebs_portal_runtime";--> statement-breakpoint
GRANT USAGE
  ON TYPE "app"."media_file_status"
  TO "shapewebs_admin_runtime", "shapewebs_web_runtime";
