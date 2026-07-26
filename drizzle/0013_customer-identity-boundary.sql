DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'shapewebs_portal_runtime'
  ) THEN
    RAISE EXCEPTION
      'shapewebs_portal_runtime must be provisioned as a non-owner, non-BYPASSRLS application role before migration 0013';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'shapewebs_portal_runtime'
      AND (
        rolsuper
        OR rolinherit
        OR rolcreaterole
        OR rolcreatedb
        OR NOT rolcanlogin
        OR rolreplication
        OR rolbypassrls
        OR pg_has_role(
          'shapewebs_portal_runtime',
          'neon_superuser',
          'member'
        )
      )
  ) THEN
    RAISE EXCEPTION
      'shapewebs_portal_runtime does not satisfy the reviewed least-privilege role contract';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM app.memberships
    WHERE role = 'customer'
  ) OR EXISTS (
    SELECT 1
    FROM app.project_memberships
  ) THEN
    RAISE EXCEPTION
      'legacy customer identity rows require an explicit reviewed migration before the admin/customer trust boundary can be split';
  END IF;
END
$$;
--> statement-breakpoint
CREATE SCHEMA "customer_auth";
--> statement-breakpoint
ALTER TYPE "app"."membership_role" RENAME TO "staff_membership_role";--> statement-breakpoint
CREATE TABLE "app"."customer_memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" "app"."membership_status" DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" text,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_memberships_pkey" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_auth"."account" (
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
CREATE TABLE "customer_auth"."rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "customer_auth"."session" (
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
CREATE TABLE "customer_auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "customer_auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."project_memberships" RENAME TO "customer_project_memberships";--> statement-breakpoint
ALTER TABLE "app"."memberships" RENAME TO "staff_memberships";--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" DROP CONSTRAINT "memberships_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" DROP CONSTRAINT "memberships_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" DROP CONSTRAINT "memberships_invited_by_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" DROP CONSTRAINT "project_memberships_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" DROP CONSTRAINT "project_memberships_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "app"."staff_membership_role";--> statement-breakpoint
CREATE TYPE "app"."staff_membership_role" AS ENUM('owner', 'editor');--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ALTER COLUMN "role" SET DATA TYPE "app"."staff_membership_role" USING "role"::"app"."staff_membership_role";--> statement-breakpoint
DROP INDEX "app"."memberships_user_idx";--> statement-breakpoint
DROP INDEX "app"."project_memberships_user_idx";--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" DROP CONSTRAINT "memberships_pkey";--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" DROP CONSTRAINT "project_memberships_pkey";--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ADD CONSTRAINT "staff_memberships_pkey" PRIMARY KEY("organization_id","user_id");--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" ADD CONSTRAINT "customer_project_memberships_pkey" PRIMARY KEY("project_id","user_id");--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" ADD CONSTRAINT "customer_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" ADD CONSTRAINT "customer_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" ADD CONSTRAINT "customer_memberships_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_memberships_user_idx" ON "app"."customer_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_account_userId_idx" ON "customer_auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_session_userId_idx" ON "customer_auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_verification_identifier_idx" ON "customer_auth"."verification" USING btree ("identifier");--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ADD CONSTRAINT "staff_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ADD CONSTRAINT "staff_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."staff_memberships" ADD CONSTRAINT "staff_memberships_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" ADD CONSTRAINT "customer_project_memberships_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" ADD CONSTRAINT "customer_project_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_memberships_user_idx" ON "app"."staff_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_project_memberships_user_idx" ON "app"."customer_project_memberships" USING btree ("user_id");--> statement-breakpoint
ALTER POLICY "members read memberships in current organization" ON "app"."staff_memberships" RENAME TO "staff read staff memberships in current organization";--> statement-breakpoint
ALTER POLICY "owner inserts memberships in current organization" ON "app"."staff_memberships" RENAME TO "owner inserts staff memberships in current organization";--> statement-breakpoint
ALTER POLICY "owner updates memberships in current organization" ON "app"."staff_memberships" RENAME TO "owner updates staff memberships in current organization";--> statement-breakpoint
ALTER POLICY "owner deletes memberships in current organization" ON "app"."staff_memberships" RENAME TO "owner deletes staff memberships in current organization";--> statement-breakpoint
ALTER POLICY "authorized members read project assignments" ON "app"."customer_project_memberships" RENAME TO "staff read customer project assignments";--> statement-breakpoint
ALTER POLICY "editors manage project assignments" ON "app"."customer_project_memberships" RENAME TO "editors manage customer project assignments";--> statement-breakpoint
ALTER POLICY "migrator reads project assignments for policy evaluation" ON "app"."customer_project_memberships" RENAME TO "migrator reads customer project assignments for policy evaluation";--> statement-breakpoint
ALTER POLICY "staff read customer project assignments" ON "app"."customer_project_memberships"
  TO "shapewebs_admin_runtime"
  USING (
    nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
    and app.project_belongs_to_current_organization("app"."customer_project_memberships"."project_id")
  );
--> statement-breakpoint
CREATE POLICY "migrator reads customer memberships for policy evaluation"
  ON "app"."customer_memberships"
  AS PERMISSIVE
  FOR SELECT
  TO "shapewebs_migrator"
  USING (true);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_customer_has_active_membership()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = on
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.customer_memberships
    WHERE app.customer_memberships.organization_id =
      nullif(current_setting('app.organization_id', true), '')::uuid
      AND app.customer_memberships.user_id =
        nullif(current_setting('app.user_id', true), '')
      AND app.customer_memberships.status = 'active'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.current_user_has_project_access(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = on
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.projects
    INNER JOIN app.customer_project_memberships
      ON app.customer_project_memberships.project_id = app.projects.id
    INNER JOIN app.customer_memberships
      ON app.customer_memberships.organization_id = app.projects.organization_id
      AND app.customer_memberships.user_id =
        app.customer_project_memberships.user_id
    WHERE app.projects.id = $1
      AND app.projects.organization_id =
        nullif(current_setting('app.organization_id', true), '')::uuid
      AND app.customer_project_memberships.user_id =
        nullif(current_setting('app.user_id', true), '')
      AND app.customer_memberships.status = 'active'
  );
$$;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON SCHEMA customer_auth FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA customer_auth FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA customer_auth FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA customer_auth FROM PUBLIC;
--> statement-breakpoint
REVOKE USAGE ON TYPE app.staff_membership_role FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA customer_auth
  FROM shapewebs_admin_runtime, shapewebs_web_runtime, shapewebs_public_reader;
--> statement-breakpoint
GRANT USAGE ON SCHEMA customer_auth TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA customer_auth
  TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT USAGE ON SCHEMA app TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT USAGE ON TYPE app.staff_membership_role TO shapewebs_admin_runtime;
--> statement-breakpoint
GRANT USAGE ON TYPE
  app.membership_status,
  app.project_status
  TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT
  ON app.organizations,
     app.customer_memberships,
     app.projects,
     app.customer_project_memberships,
     app.project_updates
  TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON app.customer_memberships
  TO shapewebs_admin_runtime;
--> statement-breakpoint
GRANT EXECUTE
  ON FUNCTION app.current_customer_has_active_membership(),
              app.current_user_has_project_access(uuid)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE EXECUTE
  ON FUNCTION app.current_customer_has_active_membership()
  FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA customer_auth
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA customer_auth
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA customer_auth
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA customer_auth
  REVOKE USAGE ON TYPES FROM PUBLIC;
--> statement-breakpoint
CREATE POLICY "portal runtime reads current customer organization" ON "app"."organizations" AS PERMISSIVE FOR SELECT TO "shapewebs_portal_runtime" USING ("app"."organizations"."id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') = 'customer'
        and app.current_customer_has_active_membership());--> statement-breakpoint
CREATE POLICY "customers read their project assignments" ON "app"."customer_project_memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_portal_runtime" USING (nullif(current_setting('app.membership_role', true), '') = 'customer'
        and "app"."customer_project_memberships"."user_id" = nullif(current_setting('app.user_id', true), '')
        and app.current_user_has_project_access("app"."customer_project_memberships"."project_id"));--> statement-breakpoint
CREATE POLICY "assigned customers read customer-visible project updates" ON "app"."project_updates" AS PERMISSIVE FOR SELECT TO "shapewebs_portal_runtime" USING (nullif(current_setting('app.membership_role', true), '') = 'customer'
        and "app"."project_updates"."visible_to_customer"
        and app.current_user_has_project_access("app"."project_updates"."project_id"));--> statement-breakpoint
CREATE POLICY "assigned customers read projects in current organization" ON "app"."projects" AS PERMISSIVE FOR SELECT TO "shapewebs_portal_runtime" USING ("app"."projects"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and nullif(current_setting('app.membership_role', true), '') = 'customer'
        and app.current_user_has_project_access("app"."projects"."id"));--> statement-breakpoint
CREATE POLICY "staff read customer memberships in current organization" ON "app"."customer_memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."customer_memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "owner manages customer memberships in current organization" ON "app"."customer_memberships" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."customer_memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner') WITH CHECK ("app"."customer_memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');--> statement-breakpoint
CREATE POLICY "customers read their current organization membership" ON "app"."customer_memberships" AS PERMISSIVE FOR SELECT TO "shapewebs_portal_runtime" USING ("app"."customer_memberships"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid
        and "app"."customer_memberships"."user_id" = nullif(current_setting('app.user_id', true), '')
        and nullif(current_setting('app.membership_role', true), '') = 'customer');--> statement-breakpoint
ALTER POLICY "authorized members read project updates" ON "app"."project_updates" TO shapewebs_admin_runtime USING (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."project_updates"."project_id"));--> statement-breakpoint
ALTER POLICY "authorized members read projects in current organization" ON "app"."projects" TO shapewebs_admin_runtime USING ("app"."projects"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));
