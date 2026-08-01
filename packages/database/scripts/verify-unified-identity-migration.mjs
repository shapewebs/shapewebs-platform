import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";

const command = process.argv[2];
const databaseUrl =
  command === "diagnose-unified-migration"
    ? process.env.DATABASE_MIGRATION_URL
    : process.env.DATABASE_OWNER_URL;

if (!databaseUrl) {
  throw new Error(
    command === "diagnose-unified-migration"
      ? "DATABASE_MIGRATION_URL is required."
      : "DATABASE_OWNER_URL is required.",
  );
}

if (
  ![
    "seed-conflict",
    "seed-success",
    "diagnose-unified-migration",
    "verify-conflict-rollback",
    "verify-conflict-rejection",
    "verify-success",
  ].includes(command)
) {
  throw new Error(
    "Expected seed-success|verify-success|seed-conflict|verify-conflict-rejection|verify-conflict-rollback.",
  );
}

const sql = neon(databaseUrl);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const unifiedMigrationPath = resolve(
  scriptDirectory,
  "..",
  "..",
  "..",
  "drizzle",
  "0019_unified-account-identity.sql",
);
const timestamp = "2026-01-01T00:00:00.000Z";
const futureTimestamp = "2030-01-01T00:00:00.000Z";
const unifiedMigrationTimestamp = 1785444774325;

const successFixture = {
  canonicalMergedUserId: "identity-canonical-merged-user",
  customerOnlyAccountId: "identity-customer-credential-account",
  customerOnlyInvitationId: "91000000-0000-4000-8000-000000000003",
  customerOnlyOutboxId: "91000000-0000-4000-8000-000000000004",
  customerOnlySessionId: "identity-customer-only-session",
  customerOnlyUserId: "identity-customer-only-user",
  legacyMergedAccountId: "identity-legacy-google-account",
  legacyMergedSessionId: "identity-legacy-merged-session",
  legacyMergedUserId: "identity-legacy-merged-user",
  organizationId: "91000000-0000-4000-8000-000000000001",
  ownerUserId: "identity-migration-owner-user",
  projectId: "91000000-0000-4000-8000-000000000002",
};

const conflictFixture = {
  canonicalUserId: "identity-conflict-canonical-user",
  customerUserId: "identity-conflict-customer-user",
  email: "identity-conflict@example.test",
};

async function assertPreUnifiedSchema() {
  const [state] = await sql`
    select
      to_regclass('auth.legacy_customer_identity_map') is null
        as identity_map_absent,
      to_regclass('auth.customer_session_security') is null
        as canonical_security_absent,
      exists (
        select 1
        from drizzle.__shapewebs_migrations
        where created_at = ${unifiedMigrationTimestamp}
      ) as unified_migration_recorded
  `;

  assert.deepEqual(state, {
    canonical_security_absent: true,
    identity_map_absent: true,
    unified_migration_recorded: false,
  });
}

async function seedSuccess() {
  await assertPreUnifiedSchema();

  await sql.transaction([
    sql`insert into auth."user" (
      id, name, email, email_verified, created_at, updated_at,
      two_factor_enabled
    ) values (
      ${successFixture.ownerUserId},
      'Identity Migration Owner',
      'identity-owner@example.test',
      true,
      ${timestamp},
      ${timestamp},
      true
    )`,
    sql`insert into auth."user" (
      id, name, email, email_verified, created_at, updated_at,
      two_factor_enabled
    ) values (
      ${successFixture.canonicalMergedUserId},
      'Canonical Merged Customer',
      'identity-merged@example.test',
      true,
      ${timestamp},
      ${timestamp},
      false
    )`,
    sql`insert into auth.account (
      id, account_id, provider_id, user_id, password, created_at, updated_at
    ) values (
      'identity-canonical-credential-account',
      ${successFixture.canonicalMergedUserId},
      'credential',
      ${successFixture.canonicalMergedUserId},
      'synthetic-password-hash-that-is-not-a-secret',
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into app.organizations (id, slug, name, active)
      values (
        ${successFixture.organizationId},
        'identity-migration-fixture',
        'Identity migration fixture',
        true
      )`,
    sql`insert into app.projects (
      id, organization_id, slug, name, status, summary
    ) values (
      ${successFixture.projectId},
      ${successFixture.organizationId},
      'identity-project',
      'Identity project',
      'in_progress',
      'Synthetic identity-migration project'
    )`,
    sql`insert into customer_auth."user" (
      id, name, email, email_verified, created_at, updated_at
    ) values (
      ${successFixture.customerOnlyUserId},
      'Customer Only Identity',
      'identity-customer-only@example.test',
      true,
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into customer_auth."user" (
      id, name, email, email_verified, created_at, updated_at
    ) values (
      ${successFixture.legacyMergedUserId},
      'Legacy Merged Customer',
      'identity-merged@example.test',
      true,
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into customer_auth.account (
      id, account_id, provider_id, user_id, password, created_at, updated_at
    ) values (
      ${successFixture.customerOnlyAccountId},
      ${successFixture.customerOnlyUserId},
      'credential',
      ${successFixture.customerOnlyUserId},
      'synthetic-customer-password-hash-not-a-secret',
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into customer_auth.account (
      id, account_id, provider_id, user_id, scope, created_at, updated_at
    ) values (
      ${successFixture.legacyMergedAccountId},
      'identity-google-subject-merged',
      'google',
      ${successFixture.legacyMergedUserId},
      'openid email profile',
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into customer_auth.session (
      id, expires_at, token, created_at, updated_at, user_id
    ) values (
      ${successFixture.customerOnlySessionId},
      ${futureTimestamp},
      'identity-customer-only-session-token',
      ${timestamp},
      ${timestamp},
      ${successFixture.customerOnlyUserId}
    )`,
    sql`insert into customer_auth.session (
      id, expires_at, token, created_at, updated_at, user_id
    ) values (
      ${successFixture.legacyMergedSessionId},
      ${futureTimestamp},
      'identity-legacy-merged-session-token',
      ${timestamp},
      ${timestamp},
      ${successFixture.legacyMergedUserId}
    )`,
    sql`insert into customer_auth.session_security (
      session_id, user_id, last_seen_at, created_at, updated_at
    ) values (
      ${successFixture.customerOnlySessionId},
      ${successFixture.customerOnlyUserId},
      ${timestamp},
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into customer_auth.session_security (
      session_id, user_id, last_seen_at, created_at, updated_at
    ) values (
      ${successFixture.legacyMergedSessionId},
      ${successFixture.legacyMergedUserId},
      ${timestamp},
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into app.customer_memberships (
      organization_id, user_id, status, invited_by_user_id, accepted_at
    ) values
      (
        ${successFixture.organizationId},
        ${successFixture.customerOnlyUserId},
        'active',
        ${successFixture.ownerUserId},
        ${timestamp}
      ),
      (
        ${successFixture.organizationId},
        ${successFixture.legacyMergedUserId},
        'active',
        ${successFixture.ownerUserId},
        ${timestamp}
      )`,
    sql`insert into app.customer_project_memberships (project_id, user_id)
      values
        (${successFixture.projectId}, ${successFixture.customerOnlyUserId}),
        (${successFixture.projectId}, ${successFixture.legacyMergedUserId})`,
    sql`insert into app.customer_invitations (
      id, organization_id, email, name, invitation_token_hash,
      invitation_token_consumed_at, claimed_user_id, claimed_at, expires_at,
      accepted_at, invited_by_user_id, created_at, updated_at
    ) values (
      ${successFixture.customerOnlyInvitationId},
      ${successFixture.organizationId},
      'identity-customer-only@example.test',
      'Customer Only Identity',
      ${"1".repeat(64)},
      ${timestamp},
      ${successFixture.customerOnlyUserId},
      ${timestamp},
      ${futureTimestamp},
      ${timestamp},
      ${successFixture.ownerUserId},
      ${timestamp},
      ${timestamp}
    )`,
    sql`insert into app.customer_invitation_projects (
      invitation_id, project_id
    ) values (
      ${successFixture.customerOnlyInvitationId},
      ${successFixture.projectId}
    )`,
    sql`insert into customer_auth.auth_email_outbox (
      id, organization_id, invitation_id, user_id, kind, recipient,
      token_hash, encrypted_token, idempotency_key, status, attempts,
      next_attempt_at, provider_message_id, processed_at, expires_at,
      consumed_at, created_at, updated_at
    ) values (
      ${successFixture.customerOnlyOutboxId},
      ${successFixture.organizationId},
      ${successFixture.customerOnlyInvitationId},
      ${successFixture.customerOnlyUserId},
      'email_verification',
      'identity-customer-only@example.test',
      ${"2".repeat(64)},
      'synthetic-encrypted-envelope-at-least-thirty-two-characters',
      'identity-migration-terminal-email-command',
      'sent',
      1,
      ${timestamp},
      'synthetic-provider-message',
      ${timestamp},
      ${futureTimestamp},
      ${timestamp},
      ${timestamp},
      ${timestamp}
    )`,
  ]);

  console.log("Seeded representative pre-unification identities.");
}

async function verifySuccess() {
  const [migrationState] = await sql`
    select
      to_regclass('auth.legacy_customer_identity_map') is not null
        as identity_map_present,
      to_regclass('auth.customer_session_security') is not null
        as canonical_security_present,
      exists (
        select 1
        from drizzle.__shapewebs_migrations
        where created_at = ${unifiedMigrationTimestamp}
      ) as unified_migration_recorded
  `;
  assert.deepEqual(migrationState, {
    canonical_security_present: true,
    identity_map_present: true,
    unified_migration_recorded: true,
  });

  const identityMap = await sql`
    select legacy_customer_user_id, user_id
    from auth.legacy_customer_identity_map
    where legacy_customer_user_id in (
      ${successFixture.customerOnlyUserId},
      ${successFixture.legacyMergedUserId}
    )
    order by legacy_customer_user_id
  `;
  assert.deepEqual(identityMap, [
    {
      legacy_customer_user_id: successFixture.customerOnlyUserId,
      user_id: successFixture.customerOnlyUserId,
    },
    {
      legacy_customer_user_id: successFixture.legacyMergedUserId,
      user_id: successFixture.canonicalMergedUserId,
    },
  ]);

  const canonicalUsers = await sql`
    select id, email, email_verified
    from auth."user"
    where email in (
      'identity-customer-only@example.test',
      'identity-merged@example.test'
    )
    order by email
  `;
  assert.deepEqual(canonicalUsers, [
    {
      email: "identity-customer-only@example.test",
      email_verified: true,
      id: successFixture.customerOnlyUserId,
    },
    {
      email: "identity-merged@example.test",
      email_verified: true,
      id: successFixture.canonicalMergedUserId,
    },
  ]);

  const accounts = await sql`
    select id, provider_id, user_id
    from auth.account
    where id in (
      ${successFixture.customerOnlyAccountId},
      ${successFixture.legacyMergedAccountId}
    )
    order by id
  `;
  assert.deepEqual(accounts, [
    {
      id: successFixture.customerOnlyAccountId,
      provider_id: "credential",
      user_id: successFixture.customerOnlyUserId,
    },
    {
      id: successFixture.legacyMergedAccountId,
      provider_id: "google",
      user_id: successFixture.canonicalMergedUserId,
    },
  ]);

  const memberships = await sql`
    select user_id
    from app.customer_memberships
    where organization_id = ${successFixture.organizationId}
    order by user_id
  `;
  assert.deepEqual(memberships, [
    { user_id: successFixture.canonicalMergedUserId },
    { user_id: successFixture.customerOnlyUserId },
  ]);

  const projectMemberships = await sql`
    select user_id
    from app.customer_project_memberships
    where project_id = ${successFixture.projectId}
    order by user_id
  `;
  assert.deepEqual(projectMemberships, memberships);

  const [invitation] = await sql`
    select claimed_user_id
    from app.customer_invitations
    where id = ${successFixture.customerOnlyInvitationId}
  `;
  assert.equal(invitation?.claimed_user_id, successFixture.customerOnlyUserId);

  const [sessionState] = await sql`
    select
      count(*) filter (
        where user_id in (
          ${successFixture.customerOnlyUserId},
          ${successFixture.legacyMergedUserId}
        )
      )::integer as remaining_legacy_sessions,
      (
        select count(*)::integer
        from customer_auth.session_security
        where user_id in (
          ${successFixture.customerOnlyUserId},
          ${successFixture.legacyMergedUserId}
        )
      ) as remaining_legacy_security
    from customer_auth.session
  `;
  assert.deepEqual(sessionState, {
    remaining_legacy_security: 0,
    remaining_legacy_sessions: 0,
  });

  const [outbox] = await sql`
    select invitation_id, status::text as status, user_id, consumed_at is not null
      as consumed
    from auth.auth_email_outbox
    where id = ${successFixture.customerOnlyOutboxId}
  `;
  assert.deepEqual(outbox, {
    consumed: true,
    invitation_id: successFixture.customerOnlyInvitationId,
    status: "sent",
    user_id: successFixture.customerOnlyUserId,
  });

  console.log(
    "Unified identity migration preserved accounts, memberships, assignments and terminal email evidence while revoking legacy sessions.",
  );
}

async function seedConflict() {
  await assertPreUnifiedSchema();
  await sql.transaction([
    sql`insert into auth."user" (
      id, name, email, email_verified, created_at, updated_at,
      two_factor_enabled
    ) values (
      ${conflictFixture.canonicalUserId},
      'Conflict Canonical User',
      ${conflictFixture.email},
      true,
      ${timestamp},
      ${timestamp},
      false
    )`,
    sql`insert into customer_auth."user" (
      id, name, email, email_verified, created_at, updated_at
    ) values (
      ${conflictFixture.customerUserId},
      'Conflict Customer User',
      ${conflictFixture.email},
      false,
      ${timestamp},
      ${timestamp}
    )`,
  ]);
  console.log("Seeded an intentionally ambiguous cross-realm identity.");
}

async function verifyConflictRollback() {
  await assertPreUnifiedSchema();

  const enumLabels = await sql`
    select enumlabel
    from pg_enum
    inner join pg_type on pg_type.oid = pg_enum.enumtypid
    inner join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'auth'
      and pg_type.typname = 'auth_email_kind'
    order by enumsortorder
  `;
  assert.deepEqual(enumLabels, [
    { enumlabel: "email_verification" },
    { enumlabel: "password_reset" },
  ]);

  const [collision] = await sql`
    select
      canonical.email_verified as canonical_verified,
      customer.email_verified as customer_verified
    from auth."user" as canonical
    inner join customer_auth."user" as customer
      on customer.email = canonical.email
    where canonical.id = ${conflictFixture.canonicalUserId}
      and customer.id = ${conflictFixture.customerUserId}
  `;
  assert.deepEqual(collision, {
    canonical_verified: true,
    customer_verified: false,
  });

  console.log(
    "Ambiguous identity migration aborted atomically and left the pre-unification schema intact.",
  );
}

function unifiedMigrationStatements() {
  const migration = readFileSync(unifiedMigrationPath, "utf8");
  return migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function verifyConflictRejection() {
  const statements = unifiedMigrationStatements();

  await assert.rejects(
    sql.transaction((transaction) =>
      statements.map((statement) => transaction.query(statement)),
    ),
    /unified identity migration aborted: unverified cross-realm email collision/i,
  );

  console.log(
    "Ambiguous identity was rejected by the explicit unverified cross-realm collision guard.",
  );
}

async function diagnoseUnifiedMigration() {
  const statements = unifiedMigrationStatements();

  await sql.transaction((transaction) =>
    statements.map((statement) => transaction.query(statement)),
  );

  throw new Error(
    "The migration SQL succeeded atomically outside drizzle-kit; investigate the migrator invocation.",
  );
}

switch (command) {
  case "diagnose-unified-migration":
    await diagnoseUnifiedMigration();
    break;
  case "seed-success":
    await seedSuccess();
    break;
  case "verify-success":
    await verifySuccess();
    break;
  case "seed-conflict":
    await seedConflict();
    break;
  case "verify-conflict-rollback":
    await verifyConflictRollback();
    break;
  case "verify-conflict-rejection":
    await verifyConflictRejection();
    break;
}
