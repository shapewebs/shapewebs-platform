CREATE SCHEMA "app";
--> statement-breakpoint
CREATE SCHEMA "audit";
--> statement-breakpoint
CREATE SCHEMA "auth";
--> statement-breakpoint
CREATE TYPE "app"."content_kind" AS ENUM('page', 'post', 'project', 'service', 'legal');--> statement-breakpoint
CREATE TYPE "app"."content_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "app"."lead_kind" AS ENUM('contact', 'project_inquiry');--> statement-breakpoint
CREATE TYPE "app"."lead_status" AS ENUM('new', 'reviewed', 'qualified', 'closed', 'spam');--> statement-breakpoint
CREATE TYPE "app"."membership_role" AS ENUM('owner', 'editor', 'customer');--> statement-breakpoint
CREATE TYPE "app"."membership_status" AS ENUM('invited', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "app"."project_status" AS ENUM('planned', 'in_progress', 'review', 'launched', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE "app"."content_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "app"."content_kind" NOT NULL,
	"slug" text NOT NULL,
	"status" "app"."content_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."content_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"payload" jsonb NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_user_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_revisions_revision_positive" CHECK ("app"."content_revisions"."revision_number" > 0)
);
--> statement-breakpoint
ALTER TABLE "app"."content_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"visibility" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"original_name" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_byte_size_positive" CHECK ("app"."files"."byte_size" > 0),
	CONSTRAINT "files_visibility_valid" CHECK ("app"."files"."visibility" in ('public', 'private'))
);
--> statement-breakpoint
ALTER TABLE "app"."files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."lead_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "app"."lead_kind" NOT NULL,
	"status" "app"."lead_status" DEFAULT 'new' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "app"."membership_role" NOT NULL,
	"status" "app"."membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_pkey" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "app"."memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_format" CHECK ("app"."organizations"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);
--> statement-breakpoint
ALTER TABLE "app"."organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."project_memberships" (
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_memberships_pkey" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "app"."project_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visible_to_customer" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."project_updates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "app"."project_status" DEFAULT 'planned' NOT NULL,
	"website_url" text,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit"."events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"request_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit"."events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "auth"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth"."two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."content_documents" ADD CONSTRAINT "content_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_documents" ADD CONSTRAINT "content_documents_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_revisions" ADD CONSTRAINT "content_revisions_document_id_content_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "app"."content_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."content_revisions" ADD CONSTRAINT "content_revisions_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."files" ADD CONSTRAINT "files_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."lead_submissions" ADD CONSTRAINT "lead_submissions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."memberships" ADD CONSTRAINT "memberships_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_memberships" ADD CONSTRAINT "project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_memberships" ADD CONSTRAINT "project_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."project_updates" ADD CONSTRAINT "project_updates_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "content_documents_organization_kind_slug_unique" ON "app"."content_documents" USING btree ("organization_id","kind","slug");--> statement-breakpoint
CREATE INDEX "content_documents_publication_idx" ON "app"."content_documents" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "content_revisions_document_revision_locale_unique" ON "app"."content_revisions" USING btree ("document_id","revision_number","locale");--> statement-breakpoint
CREATE INDEX "content_revisions_document_created_idx" ON "app"."content_revisions" USING btree ("document_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_unique" ON "app"."files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "lead_submissions_organization_status_created_idx" ON "app"."lead_submissions" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "app"."memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "app"."organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "project_memberships_user_idx" ON "app"."project_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_updates_project_created_idx" ON "app"."project_updates" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_organization_slug_unique" ON "app"."projects" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "projects_organization_status_idx" ON "app"."projects" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "audit_events_organization_occurred_idx" ON "audit"."events" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_occurred_idx" ON "audit"."events" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "auth"."two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "auth"."two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "auth"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE FUNCTION app.project_belongs_to_current_organization(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.projects
    WHERE app.projects.id = $1
      AND app.projects.organization_id =
        nullif(current_setting('app.organization_id', true), '')::uuid
  );
$$;--> statement-breakpoint
CREATE FUNCTION app.current_user_has_project_access(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.projects
    INNER JOIN app.project_memberships
      ON app.project_memberships.project_id = app.projects.id
    WHERE app.projects.id = $1
      AND app.projects.organization_id =
        nullif(current_setting('app.organization_id', true), '')::uuid
      AND app.project_memberships.user_id =
        nullif(current_setting('app.user_id', true), '')
  );
$$;--> statement-breakpoint
CREATE POLICY "admins read content in current organization" ON "app"."content_documents" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors manage content in current organization" ON "app"."content_documents" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "public reader reads published content" ON "app"."content_documents" AS PERMISSIVE FOR SELECT TO "shapewebs_public_reader" USING ("app"."content_documents"."status" = 'published' and "app"."content_documents"."published_at" is not null);--> statement-breakpoint
CREATE POLICY "web runtime reads published content" ON "app"."content_documents" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."content_documents"."status" = 'published' and "app"."content_documents"."published_at" is not null);--> statement-breakpoint
CREATE POLICY "admins read revisions in current organization" ON "app"."content_revisions" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor') and exists (
        select 1
        from "app"."content_documents"
        where "app"."content_documents"."id" = "app"."content_revisions"."document_id"
          and "app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
      ));--> statement-breakpoint
CREATE POLICY "editors insert immutable revisions" ON "app"."content_revisions" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor') and "app"."content_revisions"."created_by_user_id" = nullif(current_setting('app.user_id', true), '') and exists (
        select 1
        from "app"."content_documents"
        where "app"."content_documents"."id" = "app"."content_revisions"."document_id"
          and "app"."content_documents"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
      ));--> statement-breakpoint
CREATE POLICY "public reader reads published revisions" ON "app"."content_revisions" AS PERMISSIVE FOR SELECT TO "shapewebs_public_reader" USING ("app"."content_revisions"."published_at" is not null and exists (
        select 1
        from "app"."content_documents"
        where "app"."content_documents"."id" = "app"."content_revisions"."document_id"
          and "app"."content_documents"."status" = 'published'
      ));--> statement-breakpoint
CREATE POLICY "web runtime reads published revisions" ON "app"."content_revisions" AS PERMISSIVE FOR SELECT TO "shapewebs_web_runtime" USING ("app"."content_revisions"."published_at" is not null and exists (
        select 1
        from "app"."content_documents"
        where "app"."content_documents"."id" = "app"."content_revisions"."document_id"
          and "app"."content_documents"."status" = 'published'
      ));--> statement-breakpoint
CREATE POLICY "admins read files in current organization" ON "app"."files" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors insert files in current organization" ON "app"."files" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor') and "app"."files"."uploaded_by_user_id" = nullif(current_setting('app.user_id', true), ''));--> statement-breakpoint
CREATE POLICY "editors delete files in current organization" ON "app"."files" AS PERMISSIVE FOR DELETE TO "shapewebs_admin_runtime" USING ("app"."files"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "admins read leads in current organization" ON "app"."lead_submissions" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "editors update leads in current organization" ON "app"."lead_submissions" AS PERMISSIVE FOR UPDATE TO "shapewebs_admin_runtime" USING ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "web runtime inserts leads for configured organization" ON "app"."lead_submissions" AS PERMISSIVE FOR INSERT TO "shapewebs_web_runtime" WITH CHECK ("app"."lead_submissions"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "members read memberships in current organization" ON "app"."memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor') or "app"."memberships"."user_id" = nullif(current_setting('app.user_id', true), '')));--> statement-breakpoint
CREATE POLICY "owner inserts memberships in current organization" ON "app"."memberships" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("app"."memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "owner updates memberships in current organization" ON "app"."memberships" AS PERMISSIVE FOR UPDATE TO "shapewebs_admin_runtime" USING ("app"."memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner') WITH CHECK ("app"."memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "owner deletes memberships in current organization" ON "app"."memberships" AS PERMISSIVE FOR DELETE TO "shapewebs_admin_runtime" USING ("app"."memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "admin runtime reads current organization" ON "app"."organizations" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."organizations"."id" = nullif(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "owner updates current organization" ON "app"."organizations" AS PERMISSIVE FOR UPDATE TO "shapewebs_admin_runtime" USING ("app"."organizations"."id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner') WITH CHECK ("app"."organizations"."id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "authorized members read project assignments" ON "app"."project_memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ((
        nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_memberships"."project_id")
      ) or (
        nullif(current_setting('app.membership_role', true), '') = 'customer'
        and "app"."project_memberships"."user_id" = nullif(current_setting('app.user_id', true), '')
        and app.current_user_has_project_access("app"."project_memberships"."project_id")
      ));--> statement-breakpoint
CREATE POLICY "editors manage project assignments" ON "app"."project_memberships" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_memberships"."project_id")) WITH CHECK (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_memberships"."project_id"));--> statement-breakpoint
CREATE POLICY "authorized members read project updates" ON "app"."project_updates" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING (app.project_belongs_to_current_organization("app"."project_updates"."project_id") and (
        nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        or (
          nullif(current_setting('app.membership_role', true), '') = 'customer'
          and "app"."project_updates"."visible_to_customer"
          and app.current_user_has_project_access("app"."project_updates"."project_id")
        )
      ));--> statement-breakpoint
CREATE POLICY "editors manage updates for current organization" ON "app"."project_updates" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_updates"."project_id")) WITH CHECK (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_updates"."project_id"));--> statement-breakpoint
CREATE POLICY "authorized members read projects in current organization" ON "app"."projects" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."projects"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and (
          nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
          or (
            nullif(current_setting('app.membership_role', true), '') = 'customer'
            and app.current_user_has_project_access("app"."projects"."id")
          )
        ));--> statement-breakpoint
CREATE POLICY "editors manage projects in current organization" ON "app"."projects" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."projects"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')) WITH CHECK ("app"."projects"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "runtime inserts its own audit events" ON "audit"."events" AS PERMISSIVE FOR INSERT TO "shapewebs_admin_runtime" WITH CHECK ("audit"."events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and ("audit"."events"."actor_user_id" is null or "audit"."events"."actor_user_id" = nullif(current_setting('app.user_id', true), '')));--> statement-breakpoint
CREATE POLICY "owner reads audit events in current organization" ON "audit"."events" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("audit"."events"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') = 'owner');
