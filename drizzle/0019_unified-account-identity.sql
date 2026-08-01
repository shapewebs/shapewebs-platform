DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM customer_auth."user"
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM auth."user"
    GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: normalized email collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth."user" AS customer
    INNER JOIN auth."user" AS canonical
      ON lower(btrim(canonical.email)) = lower(btrim(customer.email))
    WHERE canonical.email_verified IS NOT TRUE
       OR customer.email_verified IS NOT TRUE
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: unverified cross-realm email collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth."user" AS customer
    INNER JOIN auth."user" AS canonical
      ON canonical.id = customer.id
    WHERE lower(btrim(canonical.email)) <> lower(btrim(customer.email))
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: user id collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth.account AS customer_account
    INNER JOIN customer_auth."user" AS customer
      ON customer.id = customer_account.user_id
    INNER JOIN auth."user" AS canonical
      ON lower(btrim(canonical.email)) = lower(btrim(customer.email))
    INNER JOIN auth.account AS canonical_account
      ON canonical_account.user_id = canonical.id
     AND canonical_account.provider_id = customer_account.provider_id
    WHERE canonical_account.account_id <> customer_account.account_id
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: provider account conflict';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth.account AS customer_account
    INNER JOIN customer_auth."user" AS customer
      ON customer.id = customer_account.user_id
    INNER JOIN auth."user" AS canonical
      ON lower(btrim(canonical.email)) = lower(btrim(customer.email))
    INNER JOIN auth.account AS canonical_account
      ON canonical_account.provider_id = customer_account.provider_id
     AND canonical_account.account_id = customer_account.account_id
    WHERE canonical_account.user_id <> canonical.id
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: provider subject belongs to another user';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth.account AS customer_account
    INNER JOIN customer_auth."user" AS customer
      ON customer.id = customer_account.user_id
    INNER JOIN auth."user" AS canonical
      ON lower(btrim(canonical.email)) = lower(btrim(customer.email))
    INNER JOIN auth.account AS canonical_account
      ON canonical_account.id = customer_account.id
    WHERE canonical_account.user_id <> canonical.id
       OR canonical_account.provider_id <> customer_account.provider_id
       OR canonical_account.account_id <> customer_account.account_id
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: provider record id collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth.account
    GROUP BY user_id, provider_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: duplicate provider methods';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TYPE "auth"."auth_email_kind" RENAME TO "auth_email_kind_legacy";--> statement-breakpoint
CREATE TYPE "auth"."auth_email_kind" AS ENUM (
  'invitation',
  'email_verification',
  'password_reset'
);--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox"
  ALTER COLUMN "kind" TYPE "auth"."auth_email_kind"
  USING "kind"::text::"auth"."auth_email_kind";--> statement-breakpoint
DROP TYPE "auth"."auth_email_kind_legacy";--> statement-breakpoint
CREATE TABLE "auth"."legacy_customer_identity_map" (
	"legacy_customer_user_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"migrated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth"."customer_session_security" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" DROP CONSTRAINT "customer_invitations_claimed_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" DROP CONSTRAINT "customer_memberships_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" DROP CONSTRAINT "customer_project_memberships_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox" ADD COLUMN "invitation_id" uuid;--> statement-breakpoint
ALTER TABLE "auth"."auth_email_outbox" ADD COLUMN "consumed_at" timestamp with time zone;--> statement-breakpoint
CREATE POLICY "migrator manages canonical auth email"
  ON auth.auth_email_outbox
  AS PERMISSIVE
  FOR ALL
  TO shapewebs_migrator
  USING (true)
  WITH CHECK (true);--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM customer_auth.auth_email_outbox AS customer_outbox
    INNER JOIN auth.auth_email_outbox AS canonical_outbox
      ON canonical_outbox.id = customer_outbox.id
       OR canonical_outbox.token_hash = customer_outbox.token_hash
       OR canonical_outbox.idempotency_key = customer_outbox.idempotency_key
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: auth email command collision';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM customer_auth.auth_email_outbox
    WHERE status IN ('pending', 'processing')
      AND expires_at > statement_timestamp()
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: drain or reissue active legacy customer auth email commands';
  END IF;
END;
$$;
--> statement-breakpoint
INSERT INTO auth."user" (
  id,
  name,
  email,
  email_verified,
  image,
  created_at,
  updated_at,
  two_factor_enabled
)
SELECT
  customer.id,
  customer.name,
  lower(btrim(customer.email)),
  customer.email_verified,
  customer.image,
  customer.created_at,
  customer.updated_at,
  false
FROM customer_auth."user" AS customer
WHERE NOT EXISTS (
  SELECT 1
  FROM auth."user" AS canonical
  WHERE lower(btrim(canonical.email)) = lower(btrim(customer.email))
);
--> statement-breakpoint
INSERT INTO auth.legacy_customer_identity_map (
  legacy_customer_user_id,
  user_id
)
SELECT customer.id, canonical.id
FROM customer_auth."user" AS customer
INNER JOIN auth."user" AS canonical
  ON lower(btrim(canonical.email)) = lower(btrim(customer.email));
--> statement-breakpoint
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM auth.legacy_customer_identity_map
  ) <> (
    SELECT count(*)
    FROM customer_auth."user"
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: incomplete identity map';
  END IF;
END;
$$;
--> statement-breakpoint
INSERT INTO auth.account (
  id,
  account_id,
  provider_id,
  user_id,
  access_token,
  refresh_token,
  id_token,
  access_token_expires_at,
  refresh_token_expires_at,
  scope,
  password,
  created_at,
  updated_at
)
SELECT
  customer_account.id,
  customer_account.account_id,
  customer_account.provider_id,
  identity_map.user_id,
  customer_account.access_token,
  customer_account.refresh_token,
  customer_account.id_token,
  customer_account.access_token_expires_at,
  customer_account.refresh_token_expires_at,
  customer_account.scope,
  customer_account.password,
  customer_account.created_at,
  customer_account.updated_at
FROM customer_auth.account AS customer_account
INNER JOIN auth.legacy_customer_identity_map AS identity_map
  ON identity_map.legacy_customer_user_id = customer_account.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.account AS canonical_account
  WHERE canonical_account.user_id = identity_map.user_id
    AND canonical_account.provider_id = customer_account.provider_id
    AND canonical_account.account_id = customer_account.account_id
);
--> statement-breakpoint
INSERT INTO auth.auth_email_outbox (
  id,
  organization_id,
  invitation_id,
  user_id,
  kind,
  recipient,
  token_hash,
  encrypted_token,
  idempotency_key,
  status,
  attempts,
  next_attempt_at,
  locked_at,
  locked_by,
  provider_message_id,
  last_error_code,
  processed_at,
  expires_at,
  consumed_at,
  created_at,
  updated_at
)
SELECT
  customer_outbox.id,
  customer_outbox.organization_id,
  customer_outbox.invitation_id,
  identity_map.user_id,
  customer_outbox.kind::text::auth.auth_email_kind,
  customer_outbox.recipient,
  customer_outbox.token_hash,
  customer_outbox.encrypted_token,
  customer_outbox.idempotency_key,
  customer_outbox.status::text::auth.auth_email_status,
  customer_outbox.attempts,
  customer_outbox.next_attempt_at,
  customer_outbox.locked_at,
  customer_outbox.locked_by,
  customer_outbox.provider_message_id,
  customer_outbox.last_error_code,
  customer_outbox.processed_at,
  customer_outbox.expires_at,
  customer_outbox.consumed_at,
  customer_outbox.created_at,
  customer_outbox.updated_at
FROM customer_auth.auth_email_outbox AS customer_outbox
LEFT JOIN auth.legacy_customer_identity_map AS identity_map
  ON identity_map.legacy_customer_user_id = customer_outbox.user_id;
--> statement-breakpoint
UPDATE app.customer_invitations AS invitation
SET claimed_user_id = identity_map.user_id
FROM auth.legacy_customer_identity_map AS identity_map
WHERE invitation.claimed_user_id = identity_map.legacy_customer_user_id;
--> statement-breakpoint
UPDATE app.customer_memberships AS membership
SET user_id = identity_map.user_id
FROM auth.legacy_customer_identity_map AS identity_map
WHERE membership.user_id = identity_map.legacy_customer_user_id;
--> statement-breakpoint
UPDATE app.customer_project_memberships AS membership
SET user_id = identity_map.user_id
FROM auth.legacy_customer_identity_map AS identity_map
WHERE membership.user_id = identity_map.legacy_customer_user_id;
--> statement-breakpoint
DELETE FROM customer_auth.session;
--> statement-breakpoint
ALTER TABLE "auth"."legacy_customer_identity_map" ADD CONSTRAINT "legacy_customer_identity_map_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."customer_session_security" ADD CONSTRAINT "customer_session_security_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "auth"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."customer_session_security" ADD CONSTRAINT "customer_session_security_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legacy_customer_identity_map_user_idx" ON "auth"."legacy_customer_identity_map" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_session_security_user_idx" ON "auth"."customer_session_security" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "customer_session_security_last_seen_idx" ON "auth"."customer_session_security" USING btree ("last_seen_at");--> statement-breakpoint
ALTER TABLE "app"."customer_invitations" ADD CONSTRAINT "customer_invitations_claimed_user_id_user_id_fk" FOREIGN KEY ("claimed_user_id") REFERENCES "auth"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_memberships" ADD CONSTRAINT "customer_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."customer_project_memberships" ADD CONSTRAINT "customer_project_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE auth.auth_email_outbox
  ADD CONSTRAINT auth_email_outbox_invitation_id_customer_invitations_id_fk
  FOREIGN KEY (invitation_id)
  REFERENCES app.customer_invitations(id)
  ON DELETE CASCADE;
--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON auth.customer_session_security,
     auth.legacy_customer_identity_map
  FROM PUBLIC, shapewebs_web_runtime, shapewebs_public_reader,
       shapewebs_portal_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE
  ON auth.customer_session_security
  TO shapewebs_admin_runtime;
--> statement-breakpoint
GRANT EXECUTE
  ON FUNCTION app.current_customer_has_active_membership()
  TO shapewebs_admin_runtime;
--> statement-breakpoint
REVOKE ALL PRIVILEGES
  ON auth.legacy_customer_identity_map
  FROM shapewebs_admin_runtime;
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
SET search_path = pg_catalog, app, auth, audit
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
    OR cardinality(coalesce(p_project_ids, ARRAY[]::uuid[]))
      NOT BETWEEN 1 AND 100
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

  INSERT INTO auth.auth_email_outbox (
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
    jsonb_build_object(
      'result',
      'success',
      'project_count',
      cardinality(p_project_ids)
    )
  );

  RETURN v_invitation_id;
END;
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
SET search_path = pg_catalog, app, auth, audit
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
    OR p_verification_expires_at
      > statement_timestamp() + interval '1 hour' THEN
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

  IF NOT FOUND OR EXISTS (
    SELECT 1
    FROM auth."user"
    WHERE lower(btrim(email)) = v_email
  ) THEN
    RAISE EXCEPTION 'customer registration grant is invalid or expired'
      USING ERRCODE = '28000';
  END IF;

  INSERT INTO auth."user" (
    id,
    name,
    email,
    email_verified,
    two_factor_enabled,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    btrim(p_name),
    v_email,
    false,
    false,
    statement_timestamp(),
    statement_timestamp()
  );

  INSERT INTO auth.account (
    id,
    account_id,
    provider_id,
    user_id,
    password,
    created_at,
    updated_at
  ) VALUES (
    p_account_id,
    p_user_id,
    'credential',
    p_user_id,
    p_password_hash,
    statement_timestamp(),
    statement_timestamp()
  );

  UPDATE app.customer_invitations
  SET
    claimed_user_id = p_user_id,
    claimed_at = statement_timestamp(),
    updated_at = statement_timestamp()
  WHERE id = v_invitation.id;

  INSERT INTO auth.auth_email_outbox (
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
SET search_path = pg_catalog, app, auth, audit
SET row_security = on
AS $$
DECLARE
  v_outbox auth.auth_email_outbox%ROWTYPE;
  v_invitation app.customer_invitations%ROWTYPE;
BEGIN
  IF p_verification_token_hash !~ '^[0-9a-f]{64}$'
    OR char_length(p_final_password_hash) NOT BETWEEN 32 AND 1024 THEN
    RETURN;
  END IF;

  SELECT outbox.* INTO v_outbox
  FROM auth.auth_email_outbox AS outbox
  WHERE outbox.token_hash = p_verification_token_hash
    AND outbox.kind = 'email_verification'
    AND outbox.consumed_at IS NULL
    AND outbox.expires_at > statement_timestamp()
  FOR UPDATE;

  IF NOT FOUND OR v_outbox.user_id IS NULL OR v_outbox.invitation_id IS NULL
  THEN
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

  UPDATE auth.account AS credential
  SET password = p_final_password_hash, updated_at = statement_timestamp()
  WHERE credential.user_id = v_outbox.user_id
    AND credential.provider_id = 'credential';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE auth."user" AS customer
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

  UPDATE auth.auth_email_outbox AS outbox
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
SET search_path = pg_catalog, app, auth, audit
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
  FROM auth."user" AS customer
  WHERE customer.id = p_user_id
    AND customer.email_verified = true
    AND EXISTS (
      SELECT 1
      FROM auth.account
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
CREATE OR REPLACE FUNCTION app.authorize_customer_session(
  p_organization_id uuid,
  p_session_id text,
  p_user_id text
)
RETURNS TABLE (
  session_id text,
  user_id text,
  organization_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, app, auth
SET row_security = on
AS $$
BEGIN
  IF char_length(p_session_id) NOT BETWEEN 1 AND 128
    OR char_length(p_user_id) NOT BETWEEN 1 AND 128
    OR nullif(current_setting('app.organization_id', true), '')::uuid
      IS DISTINCT FROM p_organization_id
    OR nullif(current_setting('app.user_id', true), '')
      IS DISTINCT FROM p_user_id
    OR nullif(current_setting('app.membership_role', true), '')
      IS DISTINCT FROM 'customer' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH authorized_session AS (
    UPDATE auth.customer_session_security AS security
    SET
      last_seen_at = statement_timestamp(),
      updated_at = statement_timestamp()
    WHERE security.session_id = p_session_id
      AND security.user_id = p_user_id
      AND security.revoked_at IS NULL
      AND security.last_seen_at > statement_timestamp() - interval '24 hours'
      AND EXISTS (
        SELECT 1
        FROM auth.session AS canonical_session
        WHERE canonical_session.id = p_session_id
          AND canonical_session.user_id = p_user_id
          AND canonical_session.expires_at > statement_timestamp()
      )
      AND EXISTS (
        SELECT 1
        FROM app.customer_memberships AS membership
        WHERE membership.organization_id = p_organization_id
          AND membership.user_id = p_user_id
          AND membership.status = 'active'
      )
    RETURNING security.session_id, security.user_id
  )
  SELECT
    authorized_session.session_id,
    authorized_session.user_id,
    p_organization_id
  FROM authorized_session;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app.authorize_customer_session(uuid, text, text)
  FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app.authorize_customer_session(uuid, text, text)
  TO shapewebs_portal_runtime;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.customer_memberships AS membership
    LEFT JOIN auth."user" AS canonical
      ON canonical.id = membership.user_id
    WHERE canonical.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM app.customer_project_memberships AS membership
    LEFT JOIN auth."user" AS canonical
      ON canonical.id = membership.user_id
    WHERE canonical.id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM app.customer_invitations AS invitation
    LEFT JOIN auth."user" AS canonical
      ON canonical.id = invitation.claimed_user_id
    WHERE invitation.claimed_user_id IS NOT NULL
      AND canonical.id IS NULL
  ) THEN
    RAISE EXCEPTION
      'unified identity migration aborted: unresolved customer reference';
  END IF;
END;
$$;
