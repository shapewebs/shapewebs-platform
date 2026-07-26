CREATE TYPE "customer_auth"."auth_email_kind" AS ENUM('invitation', 'email_verification', 'password_reset');--> statement-breakpoint
CREATE TYPE "customer_auth"."auth_email_status" AS ENUM('pending', 'processing', 'sent', 'permanent_failure');--> statement-breakpoint
CREATE TABLE "app"."customer_invitation_projects" (
	"invitation_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_invitation_projects_pkey" PRIMARY KEY("invitation_id","project_id")
);
--> statement-breakpoint
ALTER TABLE "app"."customer_invitation_projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "app"."customer_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"invitation_token_hash" text NOT NULL,
	"invitation_token_consumed_at" timestamp with time zone,
	"registration_grant_hash" text,
	"registration_grant_expires_at" timestamp with time zone,
	"claimed_user_id" text,
	"claimed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"invited_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_invitations_email_normalized" CHECK ("app"."customer_invitations"."email" = lower(btrim("app"."customer_invitations"."email"))),
	CONSTRAINT "customer_invitations_email_bounded" CHECK (char_length("app"."customer_invitations"."email") between 3 and 320),
	CONSTRAINT "customer_invitations_name_bounded" CHECK (char_length(btrim("app"."customer_invitations"."name")) between 1 and 120),
	CONSTRAINT "customer_invitations_token_hash_format" CHECK ("app"."customer_invitations"."invitation_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "customer_invitations_registration_grant_complete" CHECK (("app"."customer_invitations"."registration_grant_hash" is null and "app"."customer_invitations"."registration_grant_expires_at" is null)
        or ("app"."customer_invitations"."registration_grant_hash" ~ '^[0-9a-f]{64}$' and "app"."customer_invitations"."registration_grant_expires_at" is not null)),
	CONSTRAINT "customer_invitations_claim_complete" CHECK (("app"."customer_invitations"."claimed_user_id" is null and "app"."customer_invitations"."claimed_at" is null)
        or ("app"."customer_invitations"."claimed_user_id" is not null and "app"."customer_invitations"."claimed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customer_auth"."auth_email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitation_id" uuid,
	"user_id" text,
	"kind" "customer_auth"."auth_email_kind" NOT NULL,
	"recipient" text NOT NULL,
	"token_hash" text NOT NULL,
	"encrypted_token" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "customer_auth"."auth_email_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"provider_message_id" text,
	"last_error_code" text,
	"processed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_auth_email_attempts_nonnegative" CHECK ("customer_auth"."auth_email_outbox"."attempts" >= 0),
	CONSTRAINT "customer_auth_email_recipient_normalized" CHECK ("customer_auth"."auth_email_outbox"."recipient" = lower(btrim("customer_auth"."auth_email_outbox"."recipient"))),
	CONSTRAINT "customer_auth_email_token_hash_format" CHECK ("customer_auth"."auth_email_outbox"."token_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "customer_auth"."session_security" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."customer_invitation_projects" ADD CONSTRAINT "customer_invitation_projects_invitation_id_customer_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "app"."customer_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_invitation_projects" ADD CONSTRAINT "customer_invitation_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "app"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" ADD CONSTRAINT "customer_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" ADD CONSTRAINT "customer_invitations_claimed_user_id_user_id_fk" FOREIGN KEY ("claimed_user_id") REFERENCES "customer_auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" ADD CONSTRAINT "customer_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."auth_email_outbox" ADD CONSTRAINT "auth_email_outbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."auth_email_outbox" ADD CONSTRAINT "auth_email_outbox_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."auth_email_outbox" ADD CONSTRAINT "auth_email_outbox_invitation_id_customer_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "app"."customer_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."session_security" ADD CONSTRAINT "session_security_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "customer_auth"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_auth"."session_security" ADD CONSTRAINT "session_security_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "customer_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_invitation_projects_project_idx" ON "app"."customer_invitation_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_invitations_token_hash_unique" ON "app"."customer_invitations" USING btree ("invitation_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_invitations_registration_grant_unique" ON "app"."customer_invitations" USING btree ("registration_grant_hash");--> statement-breakpoint
CREATE INDEX "customer_invitations_organization_email_idx" ON "app"."customer_invitations" USING btree ("organization_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_auth_email_token_hash_unique" ON "customer_auth"."auth_email_outbox" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_auth_email_idempotency_unique" ON "customer_auth"."auth_email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "customer_auth_email_delivery_idx" ON "customer_auth"."auth_email_outbox" USING btree ("organization_id","status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "customer_auth_email_recipient_idx" ON "customer_auth"."auth_email_outbox" USING btree ("organization_id","recipient","created_at");--> statement-breakpoint
CREATE INDEX "customer_session_security_user_idx" ON "customer_auth"."session_security" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "staff read customer invitation projects" ON "app"."customer_invitation_projects" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING (nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor')
        and app.project_belongs_to_current_organization("app"."customer_invitation_projects"."project_id"));--> statement-breakpoint
CREATE POLICY "owner manages customer invitation projects" ON "app"."customer_invitation_projects" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING (nullif(current_setting('app.membership_role', true), '') = 'owner'
        and app.project_belongs_to_current_organization("app"."customer_invitation_projects"."project_id")) WITH CHECK (nullif(current_setting('app.membership_role', true), '') = 'owner'
        and app.project_belongs_to_current_organization("app"."customer_invitation_projects"."project_id"));--> statement-breakpoint
CREATE POLICY "staff read customer invitations in current organization" ON "app"."customer_invitations" AS PERMISSIVE FOR SELECT TO "shapewebs_admin_runtime" USING ("app"."customer_invitations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') in ('owner', 'editor'));--> statement-breakpoint
CREATE POLICY "owner manages customer invitations in current organization" ON "app"."customer_invitations" AS PERMISSIVE FOR ALL TO "shapewebs_admin_runtime" USING ("app"."customer_invitations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner') WITH CHECK ("app"."customer_invitations"."organization_id" = nullif(current_setting('app.organization_id', true), '')::uuid and nullif(current_setting('app.membership_role', true), '') = 'owner');
--> statement-breakpoint
ALTER TABLE app.customer_invitations FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE app.customer_invitation_projects FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX customer_invitations_open_email_unique
  ON app.customer_invitations (organization_id, email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
--> statement-breakpoint
CREATE POLICY "migrator manages customer invitations"
  ON app.customer_invitations
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_migrator
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "migrator manages customer invitation projects"
  ON app.customer_invitation_projects
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_migrator
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "migrator reads staff memberships for customer onboarding"
  ON app.staff_memberships
  AS PERMISSIVE
  FOR SELECT
  TO shapewebs_migrator
  USING (true);
--> statement-breakpoint
CREATE POLICY "migrator manages customer memberships for onboarding"
  ON app.customer_memberships
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_migrator
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "migrator manages customer project memberships for onboarding"
  ON app.customer_project_memberships
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_migrator
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "migrator appends customer onboarding audit events"
  ON audit.events
  AS PERMISSIVE
  FOR INSERT
  TO shapewebs_migrator
  WITH CHECK (true);
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON app.customer_invitations,
  app.customer_invitation_projects
  FROM PUBLIC, shapewebs_web_runtime, shapewebs_public_reader,
  shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON app.customer_invitations, app.customer_invitation_projects
  TO shapewebs_admin_runtime;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON customer_auth.auth_email_outbox,
  customer_auth.session_security
  FROM PUBLIC, shapewebs_admin_runtime, shapewebs_web_runtime,
  shapewebs_public_reader;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON customer_auth.auth_email_outbox, customer_auth.session_security
  TO shapewebs_portal_runtime;
--> statement-breakpoint
GRANT USAGE ON TYPE customer_auth.auth_email_kind,
  customer_auth.auth_email_status
  TO shapewebs_portal_runtime;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.create_customer_invitation(
  p_organization_id uuid,
  p_invited_by_user_id text,
  p_email text,
  p_name text,
  p_invitation_token_hash text,
  p_encrypted_token text,
  p_idempotency_key text,
  p_expires_at timestamptz,
  p_project_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app, customer_auth, audit
SET row_security = on
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_invitation_id uuid;
BEGIN
  IF nullif(current_setting('app.organization_id', true), '')::uuid
      IS DISTINCT FROM p_organization_id
    OR nullif(current_setting('app.user_id', true), '')
      IS DISTINCT FROM p_invited_by_user_id
    OR nullif(current_setting('app.membership_role', true), '') <> 'owner'
    OR NOT EXISTS (
      SELECT 1
      FROM app.staff_memberships
      WHERE organization_id = p_organization_id
        AND user_id = p_invited_by_user_id
        AND role = 'owner'
        AND status = 'active'
    ) THEN
    RAISE EXCEPTION 'customer invitation is not authorized'
      USING ERRCODE = '42501';
  END IF;

  IF p_expires_at <= statement_timestamp()
    OR p_expires_at > statement_timestamp() + interval '30 days'
    OR cardinality(coalesce(p_project_ids, ARRAY[]::uuid[])) NOT BETWEEN 1 AND 100
    OR p_invitation_token_hash !~ '^[0-9a-f]{64}$'
    OR char_length(p_encrypted_token) NOT BETWEEN 32 AND 8192
    OR char_length(p_idempotency_key) NOT BETWEEN 16 AND 200 THEN
    RAISE EXCEPTION 'customer invitation input is invalid'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_project_ids, ARRAY[]::uuid[])) AS requested(id)
    LEFT JOIN app.projects
      ON projects.id = requested.id
      AND projects.organization_id = p_organization_id
    WHERE projects.id IS NULL
  ) THEN
    RAISE EXCEPTION 'customer invitation contains an invalid project'
      USING ERRCODE = '22023';
  END IF;

  UPDATE app.customer_invitations
  SET revoked_at = statement_timestamp(), updated_at = statement_timestamp()
  WHERE organization_id = p_organization_id
    AND email = v_email
    AND accepted_at IS NULL
    AND revoked_at IS NULL;

  INSERT INTO app.customer_invitations (
    organization_id,
    email,
    name,
    invitation_token_hash,
    expires_at,
    invited_by_user_id
  ) VALUES (
    p_organization_id,
    v_email,
    btrim(p_name),
    p_invitation_token_hash,
    p_expires_at,
    p_invited_by_user_id
  )
  RETURNING id INTO v_invitation_id;

  INSERT INTO app.customer_invitation_projects (invitation_id, project_id)
  SELECT v_invitation_id, requested.id
  FROM (
    SELECT DISTINCT id
    FROM unnest(coalesce(p_project_ids, ARRAY[]::uuid[])) AS project(id)
  ) AS requested;

  INSERT INTO customer_auth.auth_email_outbox (
    organization_id,
    invitation_id,
    kind,
    recipient,
    token_hash,
    encrypted_token,
    idempotency_key,
    expires_at
  ) VALUES (
    p_organization_id,
    v_invitation_id,
    'invitation',
    v_email,
    p_invitation_token_hash,
    p_encrypted_token,
    p_idempotency_key,
    p_expires_at
  );

  INSERT INTO audit.events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    p_organization_id,
    p_invited_by_user_id,
    'customer.invitation_created',
    'customer_invitation',
    v_invitation_id::text,
    jsonb_build_object('result', 'success', 'project_count', cardinality(p_project_ids))
  );

  RETURN v_invitation_id;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.exchange_customer_invitation_token(
  p_invitation_token_hash text,
  p_registration_grant_hash text,
  p_registration_grant_expires_at timestamptz
)
RETURNS TABLE (
  invitation_id uuid,
  organization_id uuid,
  email text,
  invited_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = on
AS $$
BEGIN
  IF p_invitation_token_hash !~ '^[0-9a-f]{64}$'
    OR p_registration_grant_hash !~ '^[0-9a-f]{64}$'
    OR p_registration_grant_expires_at <= statement_timestamp()
    OR p_registration_grant_expires_at > statement_timestamp() + interval '30 minutes' THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE app.customer_invitations AS invitation
  SET
    invitation_token_consumed_at = statement_timestamp(),
    registration_grant_hash = p_registration_grant_hash,
    registration_grant_expires_at = p_registration_grant_expires_at,
    updated_at = statement_timestamp()
  WHERE invitation.invitation_token_hash = p_invitation_token_hash
    AND invitation.invitation_token_consumed_at IS NULL
    AND invitation.expires_at > statement_timestamp()
    AND invitation.revoked_at IS NULL
    AND invitation.accepted_at IS NULL
    AND invitation.claimed_user_id IS NULL
  RETURNING
    invitation.id,
    invitation.organization_id,
    invitation.email,
    invitation.name;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.customer_registration_grant_matches(
  p_email text,
  p_registration_grant_hash text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, app
SET row_security = on
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.customer_invitations
    WHERE email = lower(btrim(p_email))
      AND registration_grant_hash = p_registration_grant_hash
      AND registration_grant_expires_at > statement_timestamp()
      AND expires_at > statement_timestamp()
      AND revoked_at IS NULL
      AND accepted_at IS NULL
      AND claimed_user_id IS NULL
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.register_customer_with_password(
  p_email text,
  p_name text,
  p_registration_grant_hash text,
  p_user_id text,
  p_account_id text,
  p_password_hash text,
  p_verification_token_hash text,
  p_encrypted_verification_token text,
  p_verification_idempotency_key text,
  p_verification_expires_at timestamptz
)
RETURNS TABLE (
  user_id text,
  invitation_id uuid,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app, customer_auth, audit
SET row_security = on
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_invitation app.customer_invitations%ROWTYPE;
BEGIN
  IF char_length(p_user_id) NOT BETWEEN 20 AND 128
    OR char_length(p_account_id) NOT BETWEEN 20 AND 128
    OR char_length(p_password_hash) NOT BETWEEN 32 AND 1024
    OR p_registration_grant_hash !~ '^[0-9a-f]{64}$'
    OR p_verification_token_hash !~ '^[0-9a-f]{64}$'
    OR char_length(p_encrypted_verification_token) NOT BETWEEN 32 AND 8192
    OR char_length(p_verification_idempotency_key) NOT BETWEEN 16 AND 200
    OR p_verification_expires_at <= statement_timestamp()
    OR p_verification_expires_at > statement_timestamp() + interval '1 hour' THEN
    RAISE EXCEPTION 'customer credential registration input is invalid'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_invitation
  FROM app.customer_invitations
  WHERE email = v_email
    AND registration_grant_hash = p_registration_grant_hash
    AND registration_grant_expires_at > statement_timestamp()
    AND expires_at > statement_timestamp()
    AND revoked_at IS NULL
    AND accepted_at IS NULL
    AND claimed_user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer registration grant is invalid or expired'
      USING ERRCODE = '28000';
  END IF;

  INSERT INTO customer_auth."user" (
    id, name, email, email_verified, created_at, updated_at
  ) VALUES (
    p_user_id, btrim(p_name), v_email, false,
    statement_timestamp(), statement_timestamp()
  );

  INSERT INTO customer_auth.account (
    id, account_id, provider_id, user_id, password, created_at, updated_at
  ) VALUES (
    p_account_id, p_user_id, 'credential', p_user_id, p_password_hash,
    statement_timestamp(), statement_timestamp()
  );

  UPDATE app.customer_invitations
  SET
    claimed_user_id = p_user_id,
    claimed_at = statement_timestamp(),
    updated_at = statement_timestamp()
  WHERE id = v_invitation.id;

  INSERT INTO customer_auth.auth_email_outbox (
    organization_id,
    invitation_id,
    user_id,
    kind,
    recipient,
    token_hash,
    encrypted_token,
    idempotency_key,
    expires_at
  ) VALUES (
    v_invitation.organization_id,
    v_invitation.id,
    p_user_id,
    'email_verification',
    v_email,
    p_verification_token_hash,
    p_encrypted_verification_token,
    p_verification_idempotency_key,
    p_verification_expires_at
  );

  INSERT INTO audit.events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    v_invitation.organization_id,
    p_user_id,
    'customer.credential_registration_started',
    'customer_user',
    p_user_id,
    jsonb_build_object('result', 'success')
  );

  RETURN QUERY
  SELECT p_user_id, v_invitation.id, v_invitation.organization_id;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.complete_customer_password_registration(
  p_verification_token_hash text,
  p_final_password_hash text
)
RETURNS TABLE (
  user_id text,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app, customer_auth, audit
SET row_security = on
AS $$
DECLARE
  v_outbox customer_auth.auth_email_outbox%ROWTYPE;
  v_invitation app.customer_invitations%ROWTYPE;
BEGIN
  IF p_verification_token_hash !~ '^[0-9a-f]{64}$'
    OR char_length(p_final_password_hash) NOT BETWEEN 32 AND 1024 THEN
    RETURN;
  END IF;

  SELECT outbox.* INTO v_outbox
  FROM customer_auth.auth_email_outbox AS outbox
  WHERE outbox.token_hash = p_verification_token_hash
    AND outbox.kind = 'email_verification'
    AND outbox.consumed_at IS NULL
    AND outbox.expires_at > statement_timestamp()
  FOR UPDATE;

  IF NOT FOUND OR v_outbox.user_id IS NULL OR v_outbox.invitation_id IS NULL THEN
    RETURN;
  END IF;

  SELECT invitation.* INTO v_invitation
  FROM app.customer_invitations AS invitation
  WHERE invitation.id = v_outbox.invitation_id
    AND invitation.organization_id = v_outbox.organization_id
    AND invitation.email = v_outbox.recipient
    AND invitation.claimed_user_id = v_outbox.user_id
    AND invitation.claimed_at IS NOT NULL
    AND invitation.accepted_at IS NULL
    AND invitation.revoked_at IS NULL
    AND invitation.expires_at > statement_timestamp()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE customer_auth.account AS credential
  SET password = p_final_password_hash, updated_at = statement_timestamp()
  WHERE credential.user_id = v_outbox.user_id
    AND credential.provider_id = 'credential';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE customer_auth."user" AS customer
  SET email_verified = true, updated_at = statement_timestamp()
  WHERE customer.id = v_outbox.user_id
    AND customer.email = v_outbox.recipient
    AND customer.email_verified = false;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO app.customer_memberships (
    organization_id,
    user_id,
    status,
    invited_by_user_id,
    accepted_at
  ) VALUES (
    v_invitation.organization_id,
    v_outbox.user_id,
    'active',
    v_invitation.invited_by_user_id,
    statement_timestamp()
  )
  ON CONFLICT ON CONSTRAINT customer_memberships_pkey DO UPDATE
  SET
    status = 'active',
    accepted_at = excluded.accepted_at,
    updated_at = statement_timestamp();

  INSERT INTO app.customer_project_memberships (project_id, user_id)
  SELECT project_id, v_outbox.user_id
  FROM app.customer_invitation_projects AS assignment
  WHERE assignment.invitation_id = v_invitation.id
  ON CONFLICT DO NOTHING;

  UPDATE app.customer_invitations AS invitation
  SET
    accepted_at = statement_timestamp(),
    registration_grant_hash = NULL,
    registration_grant_expires_at = NULL,
    updated_at = statement_timestamp()
  WHERE invitation.id = v_invitation.id;

  UPDATE customer_auth.auth_email_outbox AS outbox
  SET consumed_at = statement_timestamp(), updated_at = statement_timestamp()
  WHERE outbox.id = v_outbox.id;

  INSERT INTO audit.events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    v_invitation.organization_id,
    v_outbox.user_id,
    'customer.credential_registration_completed',
    'customer_user',
    v_outbox.user_id,
    jsonb_build_object('result', 'success')
  );

  RETURN QUERY
  SELECT v_outbox.user_id, v_invitation.organization_id;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.accept_customer_google_invitation(
  p_user_id text,
  p_registration_grant_hash text
)
RETURNS TABLE (
  user_id text,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app, customer_auth, audit
SET row_security = on
AS $$
DECLARE
  v_invitation app.customer_invitations%ROWTYPE;
  v_email text;
BEGIN
  IF p_registration_grant_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN;
  END IF;

  SELECT customer.email INTO v_email
  FROM customer_auth."user" AS customer
  WHERE customer.id = p_user_id
    AND customer.email_verified = true
    AND EXISTS (
      SELECT 1
      FROM customer_auth.account
      WHERE account.user_id = customer.id
        AND account.provider_id = 'google'
    );

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_invitation
  FROM app.customer_invitations
  WHERE email = v_email
    AND registration_grant_hash = p_registration_grant_hash
    AND registration_grant_expires_at > statement_timestamp()
    AND expires_at > statement_timestamp()
    AND revoked_at IS NULL
    AND accepted_at IS NULL
    AND claimed_user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE app.customer_invitations
  SET
    claimed_user_id = p_user_id,
    claimed_at = statement_timestamp(),
    accepted_at = statement_timestamp(),
    registration_grant_hash = NULL,
    registration_grant_expires_at = NULL,
    updated_at = statement_timestamp()
  WHERE id = v_invitation.id;

  INSERT INTO app.customer_memberships (
    organization_id,
    user_id,
    status,
    invited_by_user_id,
    accepted_at
  ) VALUES (
    v_invitation.organization_id,
    p_user_id,
    'active',
    v_invitation.invited_by_user_id,
    statement_timestamp()
  )
  ON CONFLICT ON CONSTRAINT customer_memberships_pkey DO UPDATE
  SET
    status = 'active',
    accepted_at = excluded.accepted_at,
    updated_at = statement_timestamp();

  INSERT INTO app.customer_project_memberships (project_id, user_id)
  SELECT project_id, p_user_id
  FROM app.customer_invitation_projects
  WHERE invitation_id = v_invitation.id
  ON CONFLICT DO NOTHING;

  INSERT INTO audit.events (
    organization_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    v_invitation.organization_id,
    p_user_id,
    'customer.google_registration_completed',
    'customer_user',
    p_user_id,
    jsonb_build_object('result', 'success')
  );

  RETURN QUERY
  SELECT p_user_id, v_invitation.organization_id;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app.customer_has_active_membership(p_user_id text)
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
    WHERE user_id = p_user_id
      AND status = 'active'
  );
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.create_customer_invitation(
  uuid, text, text, text, text, text, text, timestamptz, uuid[]
) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.create_customer_invitation(
  uuid, text, text, text, text, text, text, timestamptz, uuid[]
) TO shapewebs_admin_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.exchange_customer_invitation_token(
  text, text, timestamptz
) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.exchange_customer_invitation_token(
  text, text, timestamptz
) TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.customer_registration_grant_matches(text, text)
  FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.customer_registration_grant_matches(text, text)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.register_customer_with_password(
  text, text, text, text, text, text, text, text, text, timestamptz
) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.register_customer_with_password(
  text, text, text, text, text, text, text, text, text, timestamptz
) TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.complete_customer_password_registration(text, text)
  FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.complete_customer_password_registration(text, text)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.accept_customer_google_invitation(text, text)
  FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.accept_customer_google_invitation(text, text)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.customer_has_active_membership(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.customer_has_active_membership(text)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE shapewebs_migrator
  IN SCHEMA customer_auth
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO shapewebs_portal_runtime;
