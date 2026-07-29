import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

const {
  DATABASE_ADMIN_URL,
  DATABASE_MIGRATION_URL,
  DATABASE_OWNER_URL,
  DATABASE_PORTAL_URL,
  DATABASE_PUBLIC_URL,
  DATABASE_WEB_URL,
} = process.env;

const requiredEnvironment = [
  ["DATABASE_ADMIN_URL", DATABASE_ADMIN_URL],
  ["DATABASE_MIGRATION_URL", DATABASE_MIGRATION_URL],
  ["DATABASE_OWNER_URL", DATABASE_OWNER_URL],
  ["DATABASE_PORTAL_URL", DATABASE_PORTAL_URL],
  ["DATABASE_PUBLIC_URL", DATABASE_PUBLIC_URL],
  ["DATABASE_WEB_URL", DATABASE_WEB_URL],
];

for (const [name, value] of requiredEnvironment) {
  if (!value) {
    throw new Error(`${name} is required for the database security test.`);
  }
}

const admin = neon(DATABASE_ADMIN_URL);
const fixtureAdmin = neon(DATABASE_OWNER_URL);
const migrator = neon(DATABASE_MIGRATION_URL);
const portal = neon(DATABASE_PORTAL_URL);
const publicReader = neon(DATABASE_PUBLIC_URL);
const web = neon(DATABASE_WEB_URL);

const runId = randomUUID();
const ids = {
  adminUser: `security-admin-${runId}`,
  customerUser: `security-customer-${runId}`,
  customerShadowAdminUser: `security-customer-shadow-${runId}`,
  otherCustomerUser: `security-customer-other-${runId}`,
  otherUser: `security-other-${runId}`,
  organizationA: randomUUID(),
  organizationB: randomUUID(),
  assignedProject: randomUUID(),
  unassignedProject: randomUUID(),
  otherOrganizationProject: randomUUID(),
  visibleUpdate: randomUUID(),
  hiddenUpdate: randomUUID(),
  allowedLead: randomUUID(),
  allowedOutbox: randomUUID(),
  expiredOrdinaryLead: randomUUID(),
  expiredSyntheticLead: randomUUID(),
  expiredSyntheticOutbox: randomUUID(),
  freshSyntheticLead: randomUUID(),
  otherOrganizationSyntheticLead: randomUUID(),
  deliveredWebhook: `webhook-${randomUUID()}`,
  sentWebhook: `webhook-${randomUUID()}`,
  activeAdminSession: `security-session-active-${runId}`,
  expiredAdminSession: `security-session-expired-${runId}`,
  idleAdminSession: `security-session-idle-${runId}`,
  revokedAdminSession: `security-session-revoked-${runId}`,
  nonStepUpAdminSession: `security-session-no-step-up-${runId}`,
  otherAdminSession: `security-session-other-${runId}`,
  revocableAdminSession: `security-session-revocable-${runId}`,
  customerSession: `security-session-customer-${runId}`,
  credentialAccount: `security-credential-account-${runId}`,
  credentialUser: `security-credential-user-${runId}`,
  googleAccount: `security-google-account-${runId}`,
  googleUser: `security-google-user-${runId}`,
  draftDocument: randomUUID(),
  draftRevisionOne: randomUUID(),
  draftRevisionTwo: randomUUID(),
  publishedDocumentA: randomUUID(),
  publishedRevisionA: randomUUID(),
  nonCurrentPublishedRevisionA: randomUUID(),
  publishedDocumentB: randomUUID(),
  publishedRevisionB: randomUUID(),
  workflowDocument: randomUUID(),
  workflowRevision: randomUUID(),
  previewGrant: randomUUID(),
  sanityPreviewGrant: randomUUID(),
  contentProviderCommand: randomUUID(),
  auditEvent: randomUUID(),
  adminAuthEmail: randomUUID(),
  privateMediaA: randomUUID(),
  publicMediaA: randomUUID(),
  publicMediaB: randomUUID(),
};
const previewTokenHash = randomBytes(32).toString("hex");
const previewSessionTokenHash = randomBytes(32).toString("hex");
const replayPreviewSessionTokenHash = randomBytes(32).toString("hex");
const sanityPreviewTokenHash = randomBytes(32).toString("hex");
const sanityPreviewSessionTokenHash = randomBytes(32).toString("hex");
const replaySanityPreviewSessionTokenHash = randomBytes(32).toString("hex");
const onboarding = {
  credentialFinalPasswordHash: `final-password-hash-${randomBytes(32).toString("hex")}`,
  credentialInitialPasswordHash: `initial-password-hash-${randomBytes(32).toString("hex")}`,
  credentialInvitationTokenHash: randomBytes(32).toString("hex"),
  credentialRegistrationGrantHash: randomBytes(32).toString("hex"),
  credentialVerificationTokenHash: randomBytes(32).toString("hex"),
  googleInvitationTokenHash: randomBytes(32).toString("hex"),
  googleRegistrationGrantHash: randomBytes(32).toString("hex"),
};

async function expectDenied(operation, label) {
  await assert.rejects(operation, undefined, `${label} should be denied`);
}

async function withAdminContext({
  organizationId,
  userId,
  membershipRole,
  query,
}) {
  const [, , , result] = await admin.transaction([
    admin`select set_config('app.organization_id', ${organizationId}, true)`,
    admin`select set_config('app.user_id', ${userId}, true)`,
    admin`select set_config('app.membership_role', ${membershipRole}, true)`,
    query,
  ]);

  return result;
}

async function withPortalContext({
  organizationId,
  userId,
  membershipRole = "customer",
  query,
}) {
  const [, , , result] = await portal.transaction([
    portal`select set_config('app.organization_id', ${organizationId}, true)`,
    portal`select set_config('app.user_id', ${userId}, true)`,
    portal`select set_config('app.membership_role', ${membershipRole}, true)`,
    query,
  ]);

  return result;
}

async function seed() {
  await fixtureAdmin.transaction([
    fixtureAdmin`insert into auth.user (id, name, email, email_verified, created_at, updated_at)
      values
        (${ids.adminUser}, 'Security Admin', ${`security-admin-${runId}@example.test`}, true, now(), now()),
        (${ids.customerShadowAdminUser}, 'Security Customer Shadow', ${`security-customer-shadow-${runId}@example.test`}, true, now(), now()),
        (${ids.otherUser}, 'Security Other', ${`security-other-${runId}@example.test`}, true, now(), now())`,
    fixtureAdmin`insert into customer_auth.user (id, name, email, email_verified, created_at, updated_at)
      values
        (${ids.customerUser}, 'Security Customer', ${`security-customer-${runId}@example.test`}, true, now(), now()),
        (${ids.otherCustomerUser}, 'Security Other Customer', ${`security-other-customer-${runId}@example.test`}, true, now(), now())`,
    fixtureAdmin`insert into app.organizations (id, slug, name)
      values
        (${ids.organizationA}, ${`security-a-${runId}`}, 'Security Organization A'),
        (${ids.organizationB}, ${`security-b-${runId}`}, 'Security Organization B')`,
    fixtureAdmin`insert into app.staff_memberships (organization_id, user_id, role, status)
      values
        (${ids.organizationA}, ${ids.adminUser}, 'owner', 'active'),
        (${ids.organizationB}, ${ids.adminUser}, 'owner', 'active'),
        (${ids.organizationB}, ${ids.otherUser}, 'editor', 'active')`,
    fixtureAdmin`insert into app.customer_memberships (
        organization_id,
        user_id,
        status,
        accepted_at
      )
      values
        (${ids.organizationA}, ${ids.customerUser}, 'active', now()),
        (${ids.organizationB}, ${ids.otherCustomerUser}, 'active', now())`,
    fixtureAdmin`insert into auth.session (
        id,
        expires_at,
        token,
        created_at,
        updated_at,
        user_id
      )
      values
        (
          ${ids.activeAdminSession},
          now() + interval '8 hours',
          ${`token-active-${runId}`},
          now(),
          now(),
          ${ids.adminUser}
        ),
        (
          ${ids.expiredAdminSession},
          now() - interval '1 minute',
          ${`token-expired-${runId}`},
          now() - interval '9 hours',
          now(),
          ${ids.adminUser}
        ),
        (
          ${ids.idleAdminSession},
          now() + interval '8 hours',
          ${`token-idle-${runId}`},
          now(),
          now(),
          ${ids.adminUser}
        ),
        (
          ${ids.revokedAdminSession},
          now() + interval '8 hours',
          ${`token-revoked-${runId}`},
          now(),
          now(),
          ${ids.adminUser}
        ),
        (
          ${ids.nonStepUpAdminSession},
          now() + interval '8 hours',
          ${`token-no-step-up-${runId}`},
          now(),
          now(),
          ${ids.adminUser}
        ),
        (
          ${ids.customerSession},
          now() + interval '8 hours',
          ${`token-customer-${runId}`},
          now(),
          now(),
          ${ids.customerShadowAdminUser}
        ),
        (
          ${ids.otherAdminSession},
          now() + interval '8 hours',
          ${`token-other-${runId}`},
          now(),
          now(),
          ${ids.otherUser}
        ),
        (
          ${ids.revocableAdminSession},
          now() + interval '8 hours',
          ${`token-revocable-${runId}`},
          now(),
          now(),
          ${ids.adminUser}
        )`,
    fixtureAdmin`insert into auth.admin_session_security (
        session_id,
        user_id,
        last_seen_at,
        step_up_verified_at,
        revoked_at
      )
      values
        (
          ${ids.activeAdminSession},
          ${ids.adminUser},
          now(),
          now(),
          null
        ),
        (
          ${ids.expiredAdminSession},
          ${ids.adminUser},
          now(),
          now(),
          null
        ),
        (
          ${ids.idleAdminSession},
          ${ids.adminUser},
          now() - interval '31 minutes',
          now() - interval '31 minutes',
          null
        ),
        (
          ${ids.revokedAdminSession},
          ${ids.adminUser},
          now(),
          now(),
          now()
        ),
        (
          ${ids.nonStepUpAdminSession},
          ${ids.adminUser},
          now(),
          null,
          null
        ),
        (
          ${ids.customerSession},
          ${ids.customerShadowAdminUser},
          now(),
          now(),
          null
        ),
        (
          ${ids.otherAdminSession},
          ${ids.otherUser},
          now(),
          now(),
          null
        ),
        (
          ${ids.revocableAdminSession},
          ${ids.adminUser},
          now(),
          now(),
          null
        )`,
    fixtureAdmin`insert into app.projects (id, organization_id, slug, name, status)
      values
        (${ids.assignedProject}, ${ids.organizationA}, 'assigned', 'Assigned Project', 'in_progress'),
        (${ids.unassignedProject}, ${ids.organizationA}, 'unassigned', 'Unassigned Project', 'planned'),
        (${ids.otherOrganizationProject}, ${ids.organizationB}, 'other-org', 'Other Organization Project', 'review')`,
    fixtureAdmin`insert into app.customer_project_memberships (project_id, user_id)
      values
        (${ids.assignedProject}, ${ids.customerUser}),
        (${ids.otherOrganizationProject}, ${ids.otherCustomerUser})`,
    fixtureAdmin`insert into app.project_updates (
        id,
        project_id,
        title,
        body,
        visible_to_customer,
        created_by_user_id
      )
      values
        (${ids.visibleUpdate}, ${ids.assignedProject}, 'Visible update', 'Visible', true, ${ids.adminUser}),
        (${ids.hiddenUpdate}, ${ids.assignedProject}, 'Hidden update', 'Hidden', false, ${ids.adminUser})`,
    fixtureAdmin`insert into app.files (
        id,
        organization_id,
        storage_key,
        visibility,
        status,
        storage_provider,
        store_id,
        storage_url,
        storage_etag,
        mime_type,
        byte_size,
        original_byte_size,
        sha256,
        width,
        height,
        original_name,
        uploaded_by_user_id
      )
      values
        (
          ${ids.privateMediaA},
          ${ids.organizationA},
          ${`organizations/${ids.organizationA}/drafts/${ids.privateMediaA}.webp`},
          'private',
          'ready',
          'vercel_blob',
          'store_private_security',
          ${`https://security.private.blob.vercel-storage.com/${ids.privateMediaA}.webp`},
          ${`etag-${ids.privateMediaA}`},
          'image/webp',
          128,
          256,
          ${"a".repeat(64)},
          20,
          20,
          'private.png',
          ${ids.adminUser}
        ),
        (
          ${ids.publicMediaA},
          ${ids.organizationA},
          ${`organizations/${ids.organizationA}/public/${ids.publicMediaA}.webp`},
          'public',
          'ready',
          'vercel_blob',
          'store_public_security',
          ${`https://security.public.blob.vercel-storage.com/${ids.publicMediaA}.webp`},
          ${`etag-${ids.publicMediaA}`},
          'image/webp',
          96,
          192,
          ${"b".repeat(64)},
          16,
          16,
          'public.png',
          ${ids.adminUser}
        ),
        (
          ${ids.publicMediaB},
          ${ids.organizationB},
          ${`organizations/${ids.organizationB}/public/${ids.publicMediaB}.webp`},
          'public',
          'ready',
          'vercel_blob',
          'store_public_security',
          ${`https://security.public.blob.vercel-storage.com/${ids.publicMediaB}.webp`},
          ${`etag-${ids.publicMediaB}`},
          'image/webp',
          96,
          192,
          ${"c".repeat(64)},
          16,
          16,
          'other-public.png',
          ${ids.adminUser}
        )`,
    fixtureAdmin`insert into app.file_localizations (
        organization_id,
        file_id,
        locale,
        alt_text,
        caption
      )
      values
        (${ids.organizationA}, ${ids.privateMediaA}, 'en', 'Private organization A image', null),
        (${ids.organizationA}, ${ids.publicMediaA}, 'en', 'Public organization A image', 'Published caption'),
        (${ids.organizationB}, ${ids.publicMediaB}, 'en', 'Public organization B image', null)`,
    fixtureAdmin`insert into app.content_documents (
        id,
        organization_id,
        kind,
        slug,
        status,
        created_by_user_id,
        published_at
      )
      values
        (${ids.draftDocument}, ${ids.organizationA}, 'page', 'draft', 'draft', ${ids.adminUser}, null),
        (${ids.publishedDocumentA}, ${ids.organizationA}, 'page', 'published-a', 'published', ${ids.adminUser}, now()),
        (${ids.publishedDocumentB}, ${ids.organizationB}, 'page', 'published-b', 'published', ${ids.adminUser}, now()),
        (${ids.workflowDocument}, ${ids.organizationA}, 'method', 'secure-method', 'review', ${ids.adminUser}, null)`,
    fixtureAdmin`insert into app.content_revisions (
        id,
        document_id,
        command_id,
        revision_number,
        locale,
        status,
        slug,
        page_kind,
        title,
        summary,
        payload,
        seo,
        change_note,
        created_by_user_id,
        published_at
      )
      values
        (${ids.draftRevisionOne}, ${ids.draftDocument}, ${ids.draftRevisionOne}, 1, 'en', 'draft', 'draft', 'standard', 'Draft revision one', null, '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Initial draft', ${ids.adminUser}, null),
        (${ids.draftRevisionTwo}, ${ids.draftDocument}, ${ids.draftRevisionTwo}, 2, 'en', 'draft', 'draft', 'standard', 'Draft revision two', 'Latest draft', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Second draft', ${ids.adminUser}, null),
        (${ids.publishedRevisionA}, ${ids.publishedDocumentA}, ${ids.publishedRevisionA}, 1, 'en', 'published', 'published-a', 'standard', 'Published A', 'Organization A', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Publish A', ${ids.adminUser}, now()),
        (${ids.nonCurrentPublishedRevisionA}, ${ids.publishedDocumentA}, ${ids.nonCurrentPublishedRevisionA}, 2, 'en', 'published', 'published-a', 'standard', 'Non-current published revision', 'Must remain private', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Non-current snapshot', ${ids.adminUser}, now()),
        (${ids.publishedRevisionB}, ${ids.publishedDocumentB}, ${ids.publishedRevisionB}, 1, 'en', 'published', 'published-b', 'standard', 'Published B', 'Organization B', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Publish B', ${ids.adminUser}, now()),
        (${ids.workflowRevision}, ${ids.workflowDocument}, ${ids.workflowRevision}, 1, 'da-DK', 'review', 'secure-method', null, 'Sikker metode', 'Workflow enum coverage', '{"schemaVersion":1,"blocks":[]}'::jsonb, '{}'::jsonb, 'Review method', ${ids.adminUser}, null)`,
    fixtureAdmin`insert into app.content_localizations (
        organization_id,
        document_id,
        kind,
        locale,
        slug,
        title,
        summary,
        seo,
        published_revision_id,
        published_at
      )
      values
        (${ids.organizationA}, ${ids.draftDocument}, 'page', 'en', 'draft', 'Draft revision two', 'Latest draft', '{}'::jsonb, null, null),
        (${ids.organizationA}, ${ids.publishedDocumentA}, 'page', 'en', 'published-a', 'Published A', 'Organization A', '{}'::jsonb, ${ids.publishedRevisionA}, now()),
        (${ids.organizationB}, ${ids.publishedDocumentB}, 'page', 'en', 'published-b', 'Published B', 'Organization B', '{}'::jsonb, ${ids.publishedRevisionB}, now()),
        (${ids.organizationA}, ${ids.workflowDocument}, 'method', 'da-DK', 'secure-method', 'Sikker metode', 'Workflow enum coverage', '{}'::jsonb, null, null)`,
    fixtureAdmin`insert into app.content_preview_grants (
        id,
        organization_id,
        document_id,
        revision_id,
        locale,
        path,
        token_hash,
        expires_at,
        created_by_user_id
      )
      values (
        ${ids.previewGrant},
        ${ids.organizationA},
        ${ids.draftDocument},
        ${ids.draftRevisionTwo},
        'en',
        '/draft',
        ${previewTokenHash},
        now() + interval '30 minutes',
        ${ids.adminUser}
      )`,
    fixtureAdmin`insert into app.sanity_content_preview_grants (
        id,
        organization_id,
        document_id,
        revision_id,
        locale,
        slug,
        path,
        token_hash,
        expires_at,
        created_by_user_id
      )
      values (
        ${ids.sanityPreviewGrant},
        ${ids.organizationA},
        'blog-post-security-test',
        'sanityRevisionOne',
        'en',
        'security-test',
        '/blog/security-test',
        ${sanityPreviewTokenHash},
        now() + interval '30 minutes',
        ${ids.adminUser}
      )`,
    fixtureAdmin`update app.content_documents
      set
        page_kind = case when kind = 'page' then 'standard' else null end
      where id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.publishedDocumentB},
        ${ids.workflowDocument}
      )`,
  ]);

  await migrator.transaction([
    migrator`create policy "migrator backfills organization settings"
      on app.organizations
      for select
      to shapewebs_migrator
      using (true)`,
    migrator`create policy "migrator inserts organization settings backfill"
      on app.organization_settings
      for insert
      to shapewebs_migrator
      with check (true)`,
    migrator`create policy "migrator reads organization settings backfill conflicts"
      on app.organization_settings
      for select
      to shapewebs_migrator
      using (true)`,
    migrator`insert into app.organization_settings (
        organization_id,
        locales,
        region_profiles,
        feature_flags,
        consent_rule_sets,
        cookie_policy_versions
      )
      select
        id,
        '[{"code":"en","isDefault":true,"label":"English"},{"code":"da-DK","isDefault":false,"label":"Dansk"}]'::jsonb,
        '[{"code":"eea_uk_ch","displayName":"EEA / UK / CH","ruleSetKey":"eea_uk_ch"},{"code":"us_california","displayName":"United States / California-sensitive","ruleSetKey":"us_california"},{"code":"rest_of_world","displayName":"Rest of world","ruleSetKey":"rest_of_world"}]'::jsonb,
        '[{"enabled":false,"key":"cms.scheduled_publishing"},{"enabled":false,"key":"cms.translation_dashboard"},{"enabled":true,"key":"web.region_sensitive_consent"}]'::jsonb,
        '[{"defaultMode":"opt_in","key":"eea_uk_ch"},{"defaultMode":"mixed","key":"us_california"},{"defaultMode":"inform","key":"rest_of_world"}]'::jsonb,
        '["v1-eea","v1-us","v1-global"]'::jsonb
      from app.organizations
      where id in (${ids.organizationA}, ${ids.organizationB})
      on conflict (organization_id) do nothing`,
    migrator`drop policy "migrator reads organization settings backfill conflicts"
      on app.organization_settings`,
    migrator`drop policy "migrator inserts organization settings backfill"
      on app.organization_settings`,
    migrator`drop policy "migrator backfills organization settings"
      on app.organizations`,
  ]);

  await fixtureAdmin.transaction([
    fixtureAdmin`update app.organization_settings
      set
        locales = '[{"code":"en","isDefault":true,"label":"Organization A"}]'::jsonb,
        region_profiles = '[{"code":"organization_a","displayName":"Organization A","ruleSetKey":"organization_a"}]'::jsonb,
        feature_flags = '[{"enabled":true,"key":"security.organization_a"}]'::jsonb,
        consent_rule_sets = '[{"defaultMode":"inform","key":"organization_a"}]'::jsonb,
        cookie_policy_versions = '["security-a"]'::jsonb
      where organization_id = ${ids.organizationA}`,
    fixtureAdmin`update app.organization_settings
      set
        locales = '[{"code":"en","isDefault":true,"label":"Organization B"}]'::jsonb,
        region_profiles = '[{"code":"organization_b","displayName":"Organization B","ruleSetKey":"organization_b"}]'::jsonb,
        feature_flags = '[{"enabled":true,"key":"security.organization_b"}]'::jsonb,
        consent_rule_sets = '[{"defaultMode":"inform","key":"organization_b"}]'::jsonb,
        cookie_policy_versions = '["security-b"]'::jsonb
      where organization_id = ${ids.organizationB}`,
  ]);
}

async function cleanup() {
  await fixtureAdmin.transaction([
    fixtureAdmin`delete from audit.events
      where target_id in (
        ${ids.activeAdminSession},
        ${ids.revocableAdminSession},
        ${ids.credentialUser},
        ${ids.googleUser}
      )`,
    fixtureAdmin`delete from audit.events
      where id = ${ids.auditEvent}`,
    fixtureAdmin`delete from audit.events
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.provider_webhook_events
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.content_provider_commands
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.outbox_events
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.lead_submissions
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.organizations
      where id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from customer_auth.user
      where id in (
        ${ids.customerUser},
        ${ids.otherCustomerUser},
        ${ids.credentialUser},
        ${ids.googleUser}
      )`,
    fixtureAdmin`delete from auth.user
      where id in (${ids.adminUser}, ${ids.customerShadowAdminUser}, ${ids.otherUser})`,
  ]);
}

async function verifyRoleAttributes() {
  const roles = await migrator`
    select
      rolname,
      rolsuper,
      rolinherit,
      rolcreaterole,
      rolcreatedb,
      rolcanlogin,
      rolreplication,
      rolbypassrls,
      pg_has_role(rolname, 'neon_superuser', 'member') as neon_superuser_member
    from pg_roles
    where rolname in (
      'shapewebs_admin_runtime',
      'shapewebs_migrator',
      'shapewebs_portal_runtime',
      'shapewebs_public_reader',
      'shapewebs_web_runtime'
    )
  `;

  assert.equal(roles.length, 5);
  for (const role of roles) {
    assert.equal(role.rolsuper, false, `${role.rolname} must not be superuser`);
    assert.equal(
      role.rolcreaterole,
      false,
      `${role.rolname} must not create roles`,
    );
    assert.equal(
      role.rolcreatedb,
      false,
      `${role.rolname} must not create databases`,
    );
    assert.equal(
      role.rolbypassrls,
      false,
      `${role.rolname} must not bypass RLS`,
    );
    assert.equal(
      role.neon_superuser_member,
      false,
      `${role.rolname} must not inherit neon_superuser`,
    );

    if (role.rolname === "shapewebs_portal_runtime") {
      assert.equal(role.rolinherit, false, "portal runtime must use NOINHERIT");
      assert.equal(
        role.rolcanlogin,
        true,
        "portal runtime must be a login role",
      );
      assert.equal(
        role.rolreplication,
        false,
        "portal runtime must not replicate",
      );
    }
  }
}

async function verifyRlsCoverage() {
  const uncovered = await migrator`
    select namespace.nspname as schemaname, relation.relname as tablename
    from pg_class as relation
    inner join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where (
        namespace.nspname in ('app', 'audit')
        or (
          namespace.nspname = 'auth'
          and relation.relname = 'auth_email_outbox'
        )
      )
      and relation.relkind = 'r'
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  `;
  assert.deepEqual(
    uncovered,
    [],
    "Every app and audit table must enable and force RLS",
  );

  const residualBackfillPolicies = await migrator`
    select policyname
    from pg_policies
    where schemaname = 'app'
      and policyname in (
        'migrator backfills organization settings',
        'migrator inserts organization settings backfill',
        'migrator reads organization settings backfill conflicts'
      )
  `;
  assert.deepEqual(
    residualBackfillPolicies,
    [],
    "The temporary settings-backfill policy must not survive its transaction",
  );
}

async function verifyAdminIsolation() {
  const organizationASettings = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select organization_id, feature_flags
      from app.organization_settings`,
  });
  assert.deepEqual(organizationASettings, [
    {
      organization_id: ids.organizationA,
      feature_flags: [{ enabled: true, key: "security.organization_a" }],
    },
  ]);

  const editorSettings = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`select organization_id from app.organization_settings`,
  });
  assert.deepEqual(
    editorSettings,
    [],
    "editors must not read owner-only organization settings",
  );

  const customerSettings = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select organization_id from app.organization_settings`,
  });
  assert.deepEqual(
    customerSettings,
    [],
    "customers must not read organization settings",
  );

  const crossTenantSettingsUpdate = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`update app.organization_settings
      set updated_at = updated_at
      where organization_id = ${ids.organizationB}
      returning organization_id`,
  });
  assert.deepEqual(
    crossTenantSettingsUpdate,
    [],
    "owners must not update another organization's settings",
  );

  const ownerSettingsUpdate = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`update app.organization_settings
      set updated_at = updated_at
      where organization_id = ${ids.organizationA}
      returning organization_id`,
  });
  assert.deepEqual(ownerSettingsUpdate, [
    { organization_id: ids.organizationA },
  ]);

  const organizationAProjects = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id from app.projects order by id`,
  });
  assert.deepEqual(
    new Set(organizationAProjects.map(({ id }) => id)),
    new Set([ids.assignedProject, ids.unassignedProject]),
  );

  const customerProjects = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.projects`,
  });
  assert.deepEqual(
    customerProjects,
    [],
    "the admin runtime must not become a customer data plane by changing context",
  );

  const customerUpdates = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.project_updates`,
  });
  assert.deepEqual(customerUpdates, []);

  const customerStaffMemberships = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select user_id from app.staff_memberships`,
  });
  assert.deepEqual(customerStaffMemberships, []);

  await expectDenied(
    admin`select id from customer_auth.user`,
    "admin runtime customer-auth access",
  );

  const organizationAContent = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`
      select
        document.id,
        document.kind,
        document.status,
        localization.locale,
        localization.title
      from app.content_documents as document
      inner join app.content_localizations as localization
        on localization.document_id = document.id
      where document.id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.workflowDocument}
      )
      order by document.slug`,
  });
  assert.deepEqual(organizationAContent, [
    {
      id: ids.draftDocument,
      kind: "page",
      status: "draft",
      locale: "en",
      title: "Draft revision two",
    },
    {
      id: ids.publishedDocumentA,
      kind: "page",
      status: "published",
      locale: "en",
      title: "Published A",
    },
    {
      id: ids.workflowDocument,
      kind: "method",
      status: "review",
      locale: "da-DK",
      title: "Sikker metode",
    },
  ]);

  const editorContent = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`select id
      from app.content_documents
      where id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.workflowDocument}
      )
      order by id`,
  });
  assert.deepEqual(
    new Set(editorContent.map(({ id }) => id)),
    new Set([ids.draftDocument, ids.publishedDocumentA, ids.workflowDocument]),
  );

  const customerDrafts = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.content_documents`,
  });
  assert.deepEqual(customerDrafts, []);

  const organizationALocalizations = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select document_id, locale
      from app.content_localizations
      where document_id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.workflowDocument}
      )
      order by document_id, locale`,
  });
  assert.deepEqual(
    new Set(
      organizationALocalizations.map(
        ({ document_id, locale }) => `${document_id}:${locale}`,
      ),
    ),
    new Set([
      `${ids.draftDocument}:en`,
      `${ids.publishedDocumentA}:en`,
      `${ids.workflowDocument}:da-DK`,
    ]),
  );

  const customerLocalizations = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.content_localizations`,
  });
  assert.deepEqual(
    customerLocalizations,
    [],
    "customers must not read CMS localization drafts",
  );

  const crossTenantLocalizationUpdate = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`update app.content_localizations
      set updated_at = updated_at
      where organization_id = ${ids.organizationB}
      returning id`,
  });
  assert.deepEqual(
    crossTenantLocalizationUpdate,
    [],
    "editors must not update another organization's localization",
  );

  await expectDenied(
    withAdminContext({
      organizationId: ids.organizationA,
      userId: ids.adminUser,
      membershipRole: "editor",
      query: admin`update app.content_revisions
        set title = 'Mutated immutable revision'
        where id = ${ids.draftRevisionTwo}`,
    }),
    "immutable content revision update",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'editor', true)`,
      admin`insert into app.content_localizations (
          organization_id,
          document_id,
          kind,
          locale,
          slug,
          title
        )
        values (
          ${ids.organizationA},
          ${ids.draftDocument},
          'service',
          'da-DK',
          'spoofed-kind',
          'Spoofed kind'
        )`,
    ]),
    "localization kind/document mismatch",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'editor', true)`,
      admin`update app.content_localizations
        set
          published_revision_id = ${ids.publishedRevisionB},
          published_at = now()
        where document_id = ${ids.publishedDocumentA}
          and locale = 'en'`,
    ]),
    "localization publication pointer mismatch",
  );
}

async function verifyPortalIsolation() {
  const organization = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select id from app.organizations`,
  });
  assert.deepEqual(organization, [{ id: ids.organizationA }]);

  const memberships = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select organization_id, user_id, status
      from app.customer_memberships`,
  });
  assert.deepEqual(memberships, [
    {
      organization_id: ids.organizationA,
      user_id: ids.customerUser,
      status: "active",
    },
  ]);

  const projects = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select id from app.projects order by id`,
  });
  assert.deepEqual(projects, [{ id: ids.assignedProject }]);

  const projectAssignments = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select project_id, user_id
      from app.customer_project_memberships`,
  });
  assert.deepEqual(projectAssignments, [
    { project_id: ids.assignedProject, user_id: ids.customerUser },
  ]);

  const updates = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select id from app.project_updates`,
  });
  assert.deepEqual(updates, [{ id: ids.visibleUpdate }]);

  const crossTenantOrganization = await withPortalContext({
    organizationId: ids.organizationB,
    userId: ids.customerUser,
    query: portal`select id from app.organizations`,
  });
  const crossTenantMembership = await withPortalContext({
    organizationId: ids.organizationB,
    userId: ids.customerUser,
    query: portal`select user_id from app.customer_memberships`,
  });
  const crossTenantProject = await withPortalContext({
    organizationId: ids.organizationB,
    userId: ids.customerUser,
    query: portal`select id from app.projects`,
  });
  const crossTenantAssignment = await withPortalContext({
    organizationId: ids.organizationB,
    userId: ids.customerUser,
    query: portal`select user_id from app.customer_project_memberships`,
  });
  const crossTenantUpdate = await withPortalContext({
    organizationId: ids.organizationB,
    userId: ids.customerUser,
    query: portal`select id from app.project_updates`,
  });
  for (const [label, value] of [
    ["organization", crossTenantOrganization],
    ["membership", crossTenantMembership],
    ["project", crossTenantProject],
    ["assignment", crossTenantAssignment],
    ["update", crossTenantUpdate],
  ]) {
    assert.deepEqual(
      value,
      [],
      `a customer must not read another tenant's ${label}`,
    );
  }

  const spoofedStaffRole = await withPortalContext({
    membershipRole: "owner",
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select id from app.projects`,
  });
  assert.deepEqual(
    spoofedStaffRole,
    [],
    "the portal runtime must not become staff by changing context",
  );

  await expectDenied(
    portal`select user_id from app.staff_memberships`,
    "portal runtime staff membership access",
  );
  await expectDenied(
    portal`select id from auth.user`,
    "portal runtime administrative auth access",
  );
  await expectDenied(
    portal`select id from app.content_documents`,
    "portal runtime CMS draft access",
  );
  await expectDenied(
    withPortalContext({
      organizationId: ids.organizationA,
      userId: ids.customerUser,
      query: portal`update app.projects
        set summary = summary
        where id = ${ids.assignedProject}`,
    }),
    "portal runtime project mutation",
  );

  const suspended = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`update app.customer_memberships
      set status = 'suspended'
      where organization_id = ${ids.organizationA}
        and user_id = ${ids.customerUser}
      returning user_id`,
  });
  assert.deepEqual(suspended, [{ user_id: ids.customerUser }]);

  const suspendedProjects = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    query: portal`select id from app.projects`,
  });
  assert.deepEqual(
    suspendedProjects,
    [],
    "suspension must immediately remove project access",
  );

  await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`update app.customer_memberships
      set status = 'active'
      where organization_id = ${ids.organizationA}
        and user_id = ${ids.customerUser}`,
  });
}

async function verifyMediaIsolation() {
  const adminMedia = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`select id, visibility, status
      from app.files
      where id in (
        ${ids.privateMediaA},
        ${ids.publicMediaA},
        ${ids.publicMediaB}
      )
      order by id`,
  });
  assert.deepEqual(
    new Set(adminMedia.map(({ id }) => id)),
    new Set([ids.privateMediaA, ids.publicMediaA]),
    "editors must see only media in their current organization",
  );

  const adminLocalizations = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`select file_id, alt_text
      from app.file_localizations
      order by file_id`,
  });
  assert.deepEqual(
    new Set(adminLocalizations.map(({ file_id }) => file_id)),
    new Set([ids.privateMediaA, ids.publicMediaA]),
  );

  const crossTenantUpdate = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`update app.files
      set status = status
      where id = ${ids.publicMediaB}
      returning id`,
  });
  assert.deepEqual(
    crossTenantUpdate,
    [],
    "editors must not update another organization's media",
  );

  const webMedia = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select id, mime_type, byte_size, width, height
      from app.files
      where id in (
        ${ids.privateMediaA},
        ${ids.publicMediaA},
        ${ids.publicMediaB}
      )
      order by id`,
  ]);
  assert.deepEqual(webMedia[1], [
    {
      byte_size: 96,
      height: 16,
      id: ids.publicMediaA,
      mime_type: "image/webp",
      width: 16,
    },
  ]);

  const webLocalization = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select file_id, locale, alt_text, caption
      from app.file_localizations
      where file_id in (${ids.privateMediaA}, ${ids.publicMediaA})`,
  ]);
  assert.deepEqual(webLocalization[1], [
    {
      alt_text: "Public organization A image",
      caption: "Published caption",
      file_id: ids.publicMediaA,
      locale: "en",
    },
  ]);

  await expectDenied(
    web`select store_id from app.files`,
    "web private media store identifier read",
  );
  await expectDenied(
    web`select organization_id from app.file_localizations`,
    "web media localization tenant metadata read",
  );
  await expectDenied(
    web`insert into app.files (
      organization_id,
      storage_key,
      visibility,
      mime_type,
      byte_size,
      original_name,
      uploaded_by_user_id
    ) values (
      ${ids.organizationA},
      'forged.webp',
      'public',
      'image/webp',
      10,
      'forged.webp',
      ${ids.adminUser}
    )`,
    "web media insertion",
  );

  for (const [label, client] of [
    ["portal", portal],
    ["public", publicReader],
  ]) {
    await expectDenied(client`select id from app.files`, `${label} media read`);
    await expectDenied(
      client`select file_id from app.file_localizations`,
      `${label} media localization read`,
    );
  }
}

async function verifyCustomerCredentialOnboarding() {
  const credentialEmail = `credential-${runId}@example.test`;
  const googleEmail = `google-${runId}@example.test`;
  const credentialEncryptedToken = `encrypted-credential-invitation-${runId}`;
  const googleEncryptedToken = `encrypted-google-invitation-${runId}`;

  await expectDenied(
    web`select * from app.exchange_customer_invitation_token(
      ${onboarding.credentialInvitationTokenHash},
      ${onboarding.credentialRegistrationGrantHash},
      now() + interval '30 minutes'
    )`,
    "web invitation-token exchange",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'editor', true)`,
      admin`select app.create_customer_invitation(
        ${ids.organizationA}::uuid,
        ${ids.adminUser},
        ${`editor-denied-${runId}@example.test`},
        'Denied Editor Invitation',
        ${randomBytes(32).toString("hex")},
        ${`encrypted-editor-denied-${runId}`},
        ${`customer.invitation/editor-denied-${runId}`},
        now() + interval '7 days',
        ARRAY[${ids.assignedProject}::uuid]
      )`,
    ]),
    "editor customer invitation creation",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`select app.create_customer_invitation(
        ${ids.organizationA}::uuid,
        ${ids.adminUser},
        ${`unassigned-denied-${runId}@example.test`},
        'Unassigned Customer',
        ${randomBytes(32).toString("hex")},
        ${`encrypted-unassigned-denied-${runId}`},
        ${`customer.invitation/unassigned-denied-${runId}`},
        now() + interval '7 days',
        ARRAY[]::uuid[]
      )`,
    ]),
    "customer invitation without a project assignment",
  );

  const credentialInvitation = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`select app.create_customer_invitation(
      ${ids.organizationA}::uuid,
      ${ids.adminUser},
      ${credentialEmail},
      'Credential Customer',
      ${onboarding.credentialInvitationTokenHash},
      ${credentialEncryptedToken},
      ${`customer.invitation/${onboarding.credentialInvitationTokenHash}`},
      now() + interval '7 days',
      ARRAY[${ids.unassignedProject}::uuid]
    ) as invitation_id`,
  ]);
  const credentialInvitationId = credentialInvitation[3][0]?.invitation_id;
  assert.ok(credentialInvitationId);

  const adminInvitation = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id, email from app.customer_invitations
      where id = ${credentialInvitationId}`,
  });
  assert.deepEqual(adminInvitation, [
    { email: credentialEmail, id: credentialInvitationId },
  ]);

  await expectDenied(
    portal`select email from app.customer_invitations`,
    "portal direct invitation read",
  );
  await expectDenied(
    admin`select encrypted_token from customer_auth.auth_email_outbox`,
    "admin customer auth-email outbox read",
  );
  await expectDenied(
    web`select encrypted_token from customer_auth.auth_email_outbox`,
    "web customer auth-email outbox read",
  );

  const credentialExchange = await portal`
    select invitation_id, organization_id, email
    from app.exchange_customer_invitation_token(
      ${onboarding.credentialInvitationTokenHash},
      ${onboarding.credentialRegistrationGrantHash},
      now() + interval '30 minutes'
    )
  `;
  assert.deepEqual(credentialExchange, [
    {
      email: credentialEmail,
      invitation_id: credentialInvitationId,
      organization_id: ids.organizationA,
    },
  ]);

  const invitationReplay = await portal`
    select invitation_id
    from app.exchange_customer_invitation_token(
      ${onboarding.credentialInvitationTokenHash},
      ${randomBytes(32).toString("hex")},
      now() + interval '30 minutes'
    )
  `;
  assert.deepEqual(invitationReplay, [], "invitation URLs must be one-time");

  const grantMatches = await portal`
    select app.customer_registration_grant_matches(
      ${credentialEmail},
      ${onboarding.credentialRegistrationGrantHash}
    ) as matches
  `;
  assert.deepEqual(grantMatches, [{ matches: true }]);

  await expectDenied(
    portal`select * from app.register_customer_with_password(
      ${`wrong-${credentialEmail}`},
      'Credential Customer',
      ${onboarding.credentialRegistrationGrantHash},
      ${ids.credentialUser},
      ${ids.credentialAccount},
      ${onboarding.credentialInitialPasswordHash},
      ${onboarding.credentialVerificationTokenHash},
      ${`encrypted-verification-${runId}`},
      ${`customer.email_verification/${onboarding.credentialVerificationTokenHash}`},
      now() + interval '1 hour'
    )`,
    "mismatched invited email registration",
  );

  const credentialRegistration = await portal`
    select user_id, invitation_id, organization_id
    from app.register_customer_with_password(
      ${credentialEmail},
      'Credential Customer',
      ${onboarding.credentialRegistrationGrantHash},
      ${ids.credentialUser},
      ${ids.credentialAccount},
      ${onboarding.credentialInitialPasswordHash},
      ${onboarding.credentialVerificationTokenHash},
      ${`encrypted-verification-${runId}`},
      ${`customer.email_verification/${onboarding.credentialVerificationTokenHash}`},
      now() + interval '1 hour'
    )
  `;
  assert.deepEqual(credentialRegistration, [
    {
      invitation_id: credentialInvitationId,
      organization_id: ids.organizationA,
      user_id: ids.credentialUser,
    },
  ]);

  const provisionalIdentity = await portal`
    select customer.email_verified, account.password
    from customer_auth.user as customer
    inner join customer_auth.account as account
      on account.user_id = customer.id
      and account.provider_id = 'credential'
    where customer.id = ${ids.credentialUser}
  `;
  assert.deepEqual(provisionalIdentity, [
    {
      email_verified: false,
      password: onboarding.credentialInitialPasswordHash,
    },
  ]);
  const inactiveBeforeMailboxProof = await portal`
    select app.customer_has_active_membership(${ids.credentialUser}) as active
  `;
  assert.deepEqual(inactiveBeforeMailboxProof, [{ active: false }]);

  const completed = await portal`
    select user_id, organization_id
    from app.complete_customer_password_registration(
      ${onboarding.credentialVerificationTokenHash},
      ${onboarding.credentialFinalPasswordHash}
    )
  `;
  assert.deepEqual(completed, [
    { organization_id: ids.organizationA, user_id: ids.credentialUser },
  ]);

  const activatedCredential = await portal`
    select customer.email_verified, account.password
    from customer_auth.user as customer
    inner join customer_auth.account as account
      on account.user_id = customer.id
      and account.provider_id = 'credential'
    where customer.id = ${ids.credentialUser}
  `;
  assert.deepEqual(activatedCredential, [
    {
      email_verified: true,
      password: onboarding.credentialFinalPasswordHash,
    },
  ]);
  assert.notEqual(
    activatedCredential[0]?.password,
    onboarding.credentialInitialPasswordHash,
    "mailbox verification must replace the provisional password",
  );

  const credentialProjects = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.credentialUser,
    query: portal`select id from app.projects order by id`,
  });
  assert.deepEqual(credentialProjects, [{ id: ids.unassignedProject }]);

  const completionReplay = await portal`
    select user_id
    from app.complete_customer_password_registration(
      ${onboarding.credentialVerificationTokenHash},
      ${onboarding.credentialInitialPasswordHash}
    )
  `;
  assert.deepEqual(
    completionReplay,
    [],
    "verification tokens must be consumed exactly once",
  );

  const googleInvitation = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`select app.create_customer_invitation(
      ${ids.organizationA}::uuid,
      ${ids.adminUser},
      ${googleEmail},
      'Google Customer',
      ${onboarding.googleInvitationTokenHash},
      ${googleEncryptedToken},
      ${`customer.invitation/${onboarding.googleInvitationTokenHash}`},
      now() + interval '7 days',
      ARRAY[${ids.assignedProject}::uuid]
    ) as invitation_id`,
  ]);
  const googleInvitationId = googleInvitation[3][0]?.invitation_id;
  assert.ok(googleInvitationId);

  const googleExchange = await portal`
    select invitation_id
    from app.exchange_customer_invitation_token(
      ${onboarding.googleInvitationTokenHash},
      ${onboarding.googleRegistrationGrantHash},
      now() + interval '30 minutes'
    )
  `;
  assert.deepEqual(googleExchange, [{ invitation_id: googleInvitationId }]);

  await fixtureAdmin.transaction([
    fixtureAdmin`insert into customer_auth.user (
      id, name, email, email_verified, created_at, updated_at
    ) values (
      ${ids.googleUser}, 'Google Customer', ${googleEmail}, true, now(), now()
    )`,
    fixtureAdmin`insert into customer_auth.account (
      id, account_id, provider_id, user_id, created_at, updated_at
    ) values (
      ${ids.googleAccount}, ${`google-subject-${runId}`}, 'google',
      ${ids.googleUser}, now(), now()
    )`,
  ]);

  const googleAccepted = await portal`
    select user_id, organization_id
    from app.accept_customer_google_invitation(
      ${ids.googleUser},
      ${onboarding.googleRegistrationGrantHash}
    )
  `;
  assert.deepEqual(googleAccepted, [
    { organization_id: ids.organizationA, user_id: ids.googleUser },
  ]);

  const googleProjects = await withPortalContext({
    organizationId: ids.organizationA,
    userId: ids.googleUser,
    query: portal`select id from app.projects`,
  });
  assert.deepEqual(googleProjects, [{ id: ids.assignedProject }]);

  const googleReplay = await portal`
    select user_id
    from app.accept_customer_google_invitation(
      ${ids.googleUser},
      ${onboarding.googleRegistrationGrantHash}
    )
  `;
  assert.deepEqual(
    googleReplay,
    [],
    "Google invitation grants must be one-time",
  );

  const encryptedOutbox = await portal`
    select kind, encrypted_token
    from customer_auth.auth_email_outbox
    where organization_id = ${ids.organizationA}
      and invitation_id in (${credentialInvitationId}, ${googleInvitationId})
    order by kind, encrypted_token
  `;
  assert.equal(encryptedOutbox.length, 3);
  assert.ok(
    encryptedOutbox.every(
      ({ encrypted_token }) =>
        encrypted_token !== onboarding.credentialInvitationTokenHash &&
        encrypted_token !== onboarding.credentialVerificationTokenHash &&
        encrypted_token !== onboarding.googleInvitationTokenHash,
    ),
    "auth-email outbox rows must not store plaintext bearer tokens",
  );
}

async function authorizeSyntheticAdminSession({
  sessionId,
  userId,
  organizationId = ids.organizationA,
}) {
  const now = new Date();
  const inactivityCutoff = new Date(now.getTime() - 30 * 60 * 1_000);
  const results = await admin.transaction([
    admin`select set_config('app.organization_id', ${organizationId}, true)`,
    admin`select set_config('app.user_id', ${userId}, true)`,
    admin`select set_config('app.membership_role', '', true)`,
    admin`update auth.admin_session_security as security
      set last_seen_at = ${now}
      from auth.session as session
      where security.session_id = ${sessionId}
        and security.user_id = ${userId}
        and security.revoked_at is null
        and security.last_seen_at > ${inactivityCutoff}
        and session.id = security.session_id
        and session.user_id = security.user_id
        and session.expires_at > ${now}
        and exists (
          select 1
          from app.staff_memberships
          where organization_id = ${organizationId}
            and user_id = ${userId}
            and status = 'active'
            and role in ('owner', 'editor')
        )
      returning security.step_up_verified_at`,
    admin`select role
      from app.staff_memberships
      where organization_id = ${organizationId}
        and user_id = ${userId}
        and status = 'active'
      limit 1`,
  ]);

  const security = results[3][0];
  const membership = results[4][0];

  if (
    !security ||
    !membership ||
    !["owner", "editor"].includes(membership.role)
  ) {
    return null;
  }

  return {
    role: membership.role,
    stepUpVerifiedAt: security.step_up_verified_at,
  };
}

async function consumeSyntheticTotpCounter({
  counter,
  sessionId,
  userId = ids.adminUser,
  verifiedAt = new Date(),
}) {
  return admin`
    with accepted_counter as (
      insert into auth.admin_totp_security (
        user_id,
        last_accepted_counter,
        failed_attempts,
        locked_until,
        updated_at
      )
      values (${userId}, ${counter}, 0, null, ${verifiedAt})
      on conflict (user_id) do update
      set
        last_accepted_counter = excluded.last_accepted_counter,
        failed_attempts = 0,
        locked_until = null,
        updated_at = excluded.updated_at
      where (
        auth.admin_totp_security.locked_until is null
        or auth.admin_totp_security.locked_until <= ${verifiedAt}
      )
      and (
        auth.admin_totp_security.last_accepted_counter is null
        or auth.admin_totp_security.last_accepted_counter
          < excluded.last_accepted_counter
      )
      returning user_id
    )
    update auth.admin_session_security
    set
      last_seen_at = ${verifiedAt},
      step_up_verified_at = ${verifiedAt}
    where session_id = ${sessionId}
      and user_id = ${userId}
      and revoked_at is null
      and exists (select 1 from accepted_counter)
    returning session_id
  `;
}

async function recordSyntheticTotpFailure(failedAt = new Date()) {
  await admin`
    insert into auth.admin_totp_security (
      user_id,
      failed_attempts,
      updated_at
    )
    values (${ids.adminUser}, 1, ${failedAt})
    on conflict (user_id) do update
    set
      failed_attempts = case
        when auth.admin_totp_security.locked_until is not null
          and auth.admin_totp_security.locked_until <= ${failedAt}
          then 1
        when auth.admin_totp_security.locked_until is not null
          and auth.admin_totp_security.locked_until > ${failedAt}
          then auth.admin_totp_security.failed_attempts
        else auth.admin_totp_security.failed_attempts + 1
      end,
      locked_until = case
        when auth.admin_totp_security.locked_until is not null
          and auth.admin_totp_security.locked_until > ${failedAt}
          then auth.admin_totp_security.locked_until
        when auth.admin_totp_security.locked_until is not null
          and auth.admin_totp_security.locked_until <= ${failedAt}
          then null
        when auth.admin_totp_security.failed_attempts + 1 >= 10
          then cast(${failedAt} as timestamptz) + interval '15 minutes'
        else null
      end,
      updated_at = ${failedAt}
  `;
}

async function rotateSyntheticAdminSessionToken({
  newToken,
  rotatedAt,
  sessionId,
  userId = ids.adminUser,
  verifiedAt,
}) {
  const [, , , result] = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`
      with rotated as (
        update auth.session
        set token = ${newToken}, updated_at = ${rotatedAt}
        where id = ${sessionId}
          and user_id = ${userId}
          and expires_at > ${rotatedAt}
          and exists (
            select 1
            from auth.admin_session_security
            where session_id = ${sessionId}
              and user_id = ${userId}
              and revoked_at is null
              and step_up_verified_at = ${verifiedAt}
          )
        returning id, created_at, expires_at
      ),
      audited as (
        insert into audit.events (
          organization_id,
          actor_user_id,
          action,
          target_type,
          target_id,
          metadata
        )
        select
          ${ids.organizationA},
          ${ids.adminUser},
          'auth.session_rotated',
          'session',
          rotated.id,
          jsonb_build_object('result', 'success')
        from rotated
        returning target_id
      )
      select rotated.created_at, rotated.expires_at
      from rotated
      inner join audited on audited.target_id = rotated.id
    `,
  ]);

  return result;
}

async function revokeSyntheticOrganizationSession(targetSessionId) {
  const [, , , result] = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`
      with revoked as (
        delete from auth.session
        where id = ${targetSessionId}
          and id <> ${ids.activeAdminSession}
          and exists (
            select 1
            from app.staff_memberships
            where organization_id = ${ids.organizationA}
              and user_id = auth.session.user_id
              and status = 'active'
              and role in ('owner', 'editor')
          )
        returning id
      ),
      audited as (
        insert into audit.events (
          organization_id,
          actor_user_id,
          action,
          target_type,
          target_id,
          metadata
        )
        select
          ${ids.organizationA},
          ${ids.adminUser},
          'auth.session_revoked_by_owner',
          'session',
          revoked.id,
          jsonb_build_object('result', 'success')
        from revoked
        returning target_id
      )
      select target_id
      from audited
    `,
  ]);

  return result;
}

async function verifyAdminSessionAssurance() {
  const active = await authorizeSyntheticAdminSession({
    sessionId: ids.activeAdminSession,
    userId: ids.adminUser,
  });
  assert.equal(active?.role, "owner");
  assert.ok(active?.stepUpVerifiedAt);

  const nonStepUp = await authorizeSyntheticAdminSession({
    sessionId: ids.nonStepUpAdminSession,
    userId: ids.adminUser,
  });
  assert.equal(nonStepUp?.role, "owner");
  assert.equal(
    nonStepUp?.stepUpVerifiedAt,
    null,
    "an OAuth session without TOTP assurance must not satisfy the step-up gate",
  );

  for (const [label, sessionId, userId] of [
    ["expired", ids.expiredAdminSession, ids.adminUser],
    ["idle", ids.idleAdminSession, ids.adminUser],
    ["revoked", ids.revokedAdminSession, ids.adminUser],
    ["customer-shaped", ids.customerSession, ids.customerShadowAdminUser],
  ]) {
    assert.equal(
      await authorizeSyntheticAdminSession({ sessionId, userId }),
      null,
      `${label} session must fail closed`,
    );
  }
}

async function verifyAdminSessionManagement() {
  const visibleSessions = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`
      select session.id
      from auth.session as session
      inner join auth.admin_session_security as security
        on security.session_id = session.id
        and security.user_id = session.user_id
      inner join app.staff_memberships as membership
        on membership.organization_id = ${ids.organizationA}
        and membership.user_id = session.user_id
        and membership.status = 'active'
        and membership.role in ('owner', 'editor')
      where session.expires_at > now()
        and security.revoked_at is null
      order by session.id
    `,
  });
  const visibleSessionIds = new Set(visibleSessions.map(({ id }) => id));

  for (const sessionId of [
    ids.activeAdminSession,
    ids.idleAdminSession,
    ids.nonStepUpAdminSession,
    ids.revocableAdminSession,
  ]) {
    assert.ok(
      visibleSessionIds.has(sessionId),
      `${sessionId} should be visible to the organization owner`,
    );
  }

  for (const sessionId of [
    ids.customerSession,
    ids.expiredAdminSession,
    ids.otherAdminSession,
    ids.revokedAdminSession,
  ]) {
    assert.equal(
      visibleSessionIds.has(sessionId),
      false,
      `${sessionId} must not appear in the owner session list`,
    );
  }

  const [beforeRotation] = await admin`
    select created_at, expires_at, token
    from auth.session
    where id = ${ids.activeAdminSession}
  `;
  const verifiedAt = new Date();
  const consumed = await consumeSyntheticTotpCounter({
    counter: 13,
    sessionId: ids.activeAdminSession,
    verifiedAt,
  });
  assert.deepEqual(consumed, [{ session_id: ids.activeAdminSession }]);

  const replacementToken = randomBytes(32).toString("base64url");
  const rotatedAt = new Date(verifiedAt.getTime() + 1);
  const rotated = await rotateSyntheticAdminSessionToken({
    newToken: replacementToken,
    rotatedAt,
    sessionId: ids.activeAdminSession,
    verifiedAt,
  });
  assert.equal(rotated.length, 1);
  assert.equal(
    rotated[0].created_at.getTime(),
    beforeRotation.created_at.getTime(),
    "credential rotation must preserve the absolute session start",
  );
  assert.equal(
    rotated[0].expires_at.getTime(),
    beforeRotation.expires_at.getTime(),
    "credential rotation must preserve the absolute session expiry",
  );

  const [afterRotation] = await admin`
    select token
    from auth.session
    where id = ${ids.activeAdminSession}
  `;
  assert.equal(afterRotation.token, replacementToken);
  assert.notEqual(afterRotation.token, beforeRotation.token);

  const staleProofRotation = await rotateSyntheticAdminSessionToken({
    newToken: randomBytes(32).toString("base64url"),
    rotatedAt: new Date(rotatedAt.getTime() + 1),
    sessionId: ids.activeAdminSession,
    verifiedAt: new Date(verifiedAt.getTime() - 1),
  });
  assert.deepEqual(
    staleProofRotation,
    [],
    "token rotation must require the exact accepted step-up event",
  );

  assert.deepEqual(
    await revokeSyntheticOrganizationSession(ids.activeAdminSession),
    [],
    "the owner termination path must not revoke its current session",
  );
  assert.deepEqual(
    await revokeSyntheticOrganizationSession(ids.otherAdminSession),
    [],
    "an owner must not revoke a session outside the current organization",
  );
  assert.deepEqual(
    await revokeSyntheticOrganizationSession(ids.revocableAdminSession),
    [{ target_id: ids.revocableAdminSession }],
  );

  const [revocationState] = await fixtureAdmin`
    select
      exists (
        select 1 from auth.session
        where id = ${ids.revocableAdminSession}
      ) as session_exists,
      (
        select count(*)::integer
        from audit.events
        where action = 'auth.session_revoked_by_owner'
          and target_id = ${ids.revocableAdminSession}
      ) as audit_count
  `;
  assert.equal(revocationState.session_exists, false);
  assert.equal(revocationState.audit_count, 1);
}

async function verifyAdminTotpAssurance() {
  const firstCounter = await consumeSyntheticTotpCounter({
    counter: 10,
    sessionId: ids.nonStepUpAdminSession,
  });
  assert.deepEqual(firstCounter, [{ session_id: ids.nonStepUpAdminSession }]);

  const sameCounterInAnotherSession = await consumeSyntheticTotpCounter({
    counter: 10,
    sessionId: ids.activeAdminSession,
  });
  assert.deepEqual(
    sameCounterInAnotherSession,
    [],
    "a TOTP counter must be accepted only once across all user sessions",
  );

  const olderCounter = await consumeSyntheticTotpCounter({
    counter: 9,
    sessionId: ids.activeAdminSession,
  });
  assert.deepEqual(
    olderCounter,
    [],
    "an older TOTP counter must not be accepted after a newer counter",
  );

  const nextCounter = await consumeSyntheticTotpCounter({
    counter: 11,
    sessionId: ids.activeAdminSession,
  });
  assert.deepEqual(nextCounter, [{ session_id: ids.activeAdminSession }]);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await recordSyntheticTotpFailure();
  }

  const [locked] = await admin`
    select failed_attempts, locked_until
    from auth.admin_totp_security
    where user_id = ${ids.adminUser}
  `;
  assert.equal(locked.failed_attempts, 10);
  assert.ok(
    locked.locked_until.getTime() > Date.now(),
    "ten failed TOTP checks must lock the account",
  );

  const whileLocked = await consumeSyntheticTotpCounter({
    counter: 12,
    sessionId: ids.activeAdminSession,
  });
  assert.deepEqual(
    whileLocked,
    [],
    "a valid TOTP counter must fail closed during lockout",
  );

  await fixtureAdmin`
    update auth.admin_totp_security
    set locked_until = now() - interval '1 second'
    where user_id = ${ids.adminUser}
  `;

  const afterLockout = await consumeSyntheticTotpCounter({
    counter: 12,
    sessionId: ids.activeAdminSession,
  });
  assert.deepEqual(afterLockout, [{ session_id: ids.activeAdminSession }]);

  const [recovered] = await admin`
    select failed_attempts, last_accepted_counter, locked_until
    from auth.admin_totp_security
    where user_id = ${ids.adminUser}
  `;
  assert.equal(recovered.failed_attempts, 0);
  assert.equal(Number(recovered.last_accepted_counter), 12);
  assert.equal(recovered.locked_until, null);

  for (const [label, client] of [
    ["public", publicReader],
    ["web", web],
  ]) {
    await expectDenied(
      client`select user_id from auth.admin_totp_security`,
      `${label} TOTP replay-guard read`,
    );
    await expectDenied(
      client`insert into auth.admin_totp_security (user_id)
        values (${ids.adminUser})`,
      `${label} TOTP replay-guard write`,
    );
  }
}

async function verifyAdminAuthEmailIsolation() {
  const tokenHash = randomBytes(32).toString("hex");
  const inserted = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`insert into auth.auth_email_outbox (
      id,
      organization_id,
      user_id,
      kind,
      recipient,
      token_hash,
      encrypted_token,
      idempotency_key,
      expires_at
    ) values (
      ${ids.adminAuthEmail},
      ${ids.organizationA},
      ${ids.adminUser},
      'password_reset',
      ${`security-admin-${runId}@example.test`},
      ${tokenHash},
      ${"e".repeat(64)},
      ${`admin.password_reset/${tokenHash}`},
      now() + interval '1 hour'
    ) returning id`,
  });
  assert.deepEqual(inserted, [{ id: ids.adminAuthEmail }]);

  const visible = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id from auth.auth_email_outbox
      where id = ${ids.adminAuthEmail}`,
  });
  assert.deepEqual(visible, [{ id: ids.adminAuthEmail }]);

  const crossTenant = await withAdminContext({
    organizationId: ids.organizationB,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id from auth.auth_email_outbox
      where id = ${ids.adminAuthEmail}`,
  });
  assert.deepEqual(
    crossTenant,
    [],
    "admin authentication email state must be tenant isolated",
  );

  await expectDenied(
    withAdminContext({
      organizationId: ids.organizationA,
      userId: ids.adminUser,
      membershipRole: "owner",
      query: admin`delete from auth.auth_email_outbox
        where id = ${ids.adminAuthEmail}`,
    }),
    "admin runtime auth-email deletion",
  );

  for (const [label, client] of [
    ["portal", portal],
    ["public", publicReader],
    ["web", web],
  ]) {
    await expectDenied(
      client`select encrypted_token from auth.auth_email_outbox`,
      `${label} administrative auth-email read`,
    );
  }
}

async function verifyPublicAndWebBoundaries() {
  const publicDocuments = await publicReader`
    select id
    from app.content_documents
    where id in (
      ${ids.draftDocument},
      ${ids.publishedDocumentA},
      ${ids.publishedDocumentB},
      ${ids.workflowDocument}
    )
    order by id
  `;
  assert.deepEqual(
    new Set(publicDocuments.map(({ id }) => id)),
    new Set([ids.publishedDocumentA, ids.publishedDocumentB]),
  );

  const publicRevisions = await publicReader`
    select id
    from app.content_revisions
    where id in (
      ${ids.draftRevisionOne},
      ${ids.draftRevisionTwo},
      ${ids.publishedRevisionA},
      ${ids.nonCurrentPublishedRevisionA},
      ${ids.publishedRevisionB},
      ${ids.workflowRevision}
    )
    order by id
  `;
  assert.deepEqual(
    new Set(publicRevisions.map(({ id }) => id)),
    new Set([ids.publishedRevisionA, ids.publishedRevisionB]),
  );

  const publicLocalizationPointers = await publicReader`
      select document_id, locale, published_revision_id
      from app.content_localizations
      where document_id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.publishedDocumentB},
        ${ids.workflowDocument}
      )
      order by document_id
  `;
  assert.deepEqual(
    new Set(
      publicLocalizationPointers.map(
        ({ document_id, locale, published_revision_id }) =>
          `${document_id}:${locale}:${published_revision_id}`,
      ),
    ),
    new Set([
      `${ids.publishedDocumentA}:en:${ids.publishedRevisionA}`,
      `${ids.publishedDocumentB}:en:${ids.publishedRevisionB}`,
    ]),
    "public must see only exact published localization pointers",
  );

  const webLocalizationPointers = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select document_id, locale, published_revision_id
      from app.content_localizations
      where document_id in (
        ${ids.draftDocument},
        ${ids.publishedDocumentA},
        ${ids.publishedDocumentB},
        ${ids.workflowDocument}
      )
      order by document_id`,
  ]);
  assert.deepEqual(webLocalizationPointers[1], [
    {
      document_id: ids.publishedDocumentA,
      locale: "en",
      published_revision_id: ids.publishedRevisionA,
    },
  ]);

  for (const [label, client] of [
    ["public", publicReader],
    ["web", web],
  ]) {
    await expectDenied(
      client`select slug from app.content_localizations`,
      `${label} current CMS localization metadata read`,
    );
    await expectDenied(
      client`select slug from app.content_documents`,
      `${label} current CMS document metadata read`,
    );
  }

  await expectDenied(
    publicReader`select token_hash from app.content_preview_grants`,
    "public preview-grant read",
  );
  await expectDenied(
    web`insert into app.content_preview_grants (
      organization_id,
      document_id,
      revision_id,
      locale,
      path,
      token_hash,
      expires_at,
      created_by_user_id
    ) values (
      ${ids.organizationA},
      ${ids.draftDocument},
      ${ids.draftRevisionTwo},
      'en',
      '/draft',
      ${randomBytes(32).toString("hex")},
      now() + interval '30 minutes',
      ${ids.adminUser}
    )`,
    "web preview-grant creation",
  );

  const wrongTenantPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationB}, true)`,
    web`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    web`select document_id from app.content_preview_grants`,
  ]);
  assert.deepEqual(
    wrongTenantPreview[2],
    [],
    "a preview token must not cross organization boundaries",
  );

  const wrongTokenPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${randomBytes(32).toString("hex")}, true)`,
    web`select document_id from app.content_preview_grants`,
  ]);
  assert.deepEqual(wrongTokenPreview[2], []);

  const consumedPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', ${previewSessionTokenHash}, true)`,
    web`update app.content_preview_grants
      set
        consumed_at = now(),
        session_token_hash = ${previewSessionTokenHash}
      where token_hash = ${previewTokenHash}
        and consumed_at is null`,
    web`select set_config('app.preview_token_hash', ${previewSessionTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', '', true)`,
    web`select document_id, revision_id
      from app.content_preview_grants
      where session_token_hash = ${previewSessionTokenHash}`,
  ]);
  assert.deepEqual(consumedPreview[6], [
    {
      document_id: ids.draftDocument,
      revision_id: ids.draftRevisionTwo,
    },
  ]);

  const replayedPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', ${replayPreviewSessionTokenHash}, true)`,
    web`update app.content_preview_grants
      set
        consumed_at = now(),
        session_token_hash = ${replayPreviewSessionTokenHash}
      where token_hash = ${previewTokenHash}
        and consumed_at is null`,
    web`select set_config('app.preview_token_hash', ${replayPreviewSessionTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', '', true)`,
    web`select document_id
      from app.content_preview_grants
      where session_token_hash = ${replayPreviewSessionTokenHash}`,
  ]);
  assert.deepEqual(
    replayedPreview[6],
    [],
    "a preview grant must be consumed at most once",
  );

  const exactPreviewRevision = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${previewSessionTokenHash}, true)`,
    web`select revision.id, revision.title
      from app.content_revisions as revision
      where revision.id in (
        ${ids.draftRevisionOne},
        ${ids.draftRevisionTwo}
      )
      order by revision.id`,
  ]);
  assert.deepEqual(exactPreviewRevision[2], [
    {
      id: ids.draftRevisionTwo,
      title: "Draft revision two",
    },
  ]);

  const activationTokenAfterConsumption = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    web`select revision.id
      from app.content_revisions as revision
      where revision.id = ${ids.draftRevisionTwo}`,
  ]);
  assert.deepEqual(
    activationTokenAfterConsumption[2],
    [],
    "a consumed URL activation token must not read preview content",
  );

  const activationGrantAfterConsumption = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${previewTokenHash}, true)`,
    web`select document_id from app.content_preview_grants`,
  ]);
  assert.deepEqual(
    activationGrantAfterConsumption[2],
    [],
    "a consumed URL activation token must not retain preview-grant access",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`insert into app.content_preview_grants (
          organization_id,
          document_id,
          revision_id,
          locale,
          path,
          token_hash,
          expires_at,
          created_by_user_id
        ) values (
          ${ids.organizationB},
          ${ids.publishedDocumentB},
          ${ids.publishedRevisionB},
          'en',
          '/published-b',
          ${randomBytes(32).toString("hex")},
          now() + interval '30 minutes',
          ${ids.adminUser}
        )`,
    ]),
    "cross-tenant preview-grant creation",
  );

  await expectDenied(
    publicReader`select token_hash from app.sanity_content_preview_grants`,
    "public Sanity preview-grant read",
  );
  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`select token_hash from app.sanity_content_preview_grants`,
    ]),
    "admin Sanity preview-token-hash read",
  );
  await expectDenied(
    web`insert into app.sanity_content_preview_grants (
      organization_id,
      document_id,
      revision_id,
      locale,
      slug,
      path,
      token_hash,
      expires_at,
      created_by_user_id
    ) values (
      ${ids.organizationA},
      'blog-post-web-forbidden',
      'sanityRevisionForbidden',
      'en',
      'web-forbidden',
      '/blog/web-forbidden',
      ${randomBytes(32).toString("hex")},
      now() + interval '30 minutes',
      ${ids.adminUser}
    )`,
    "web Sanity preview-grant creation",
  );

  const wrongTenantSanityPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationB}, true)`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewTokenHash}, true)`,
    web`select document_id from app.sanity_content_preview_grants`,
  ]);
  assert.deepEqual(
    wrongTenantSanityPreview[2],
    [],
    "a Sanity preview token must not cross organization boundaries",
  );

  const consumedSanityPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', ${sanityPreviewSessionTokenHash}, true)`,
    web`update app.sanity_content_preview_grants
      set
        consumed_at = now(),
        session_token_hash = ${sanityPreviewSessionTokenHash}
      where token_hash = ${sanityPreviewTokenHash}
        and consumed_at is null`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewSessionTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', '', true)`,
    web`select document_id, revision_id
      from app.sanity_content_preview_grants
      where session_token_hash = ${sanityPreviewSessionTokenHash}`,
  ]);
  assert.deepEqual(consumedSanityPreview[6], [
    {
      document_id: "blog-post-security-test",
      revision_id: "sanityRevisionOne",
    },
  ]);

  const replayedSanityPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', ${replaySanityPreviewSessionTokenHash}, true)`,
    web`update app.sanity_content_preview_grants
      set
        consumed_at = now(),
        session_token_hash = ${replaySanityPreviewSessionTokenHash}
      where token_hash = ${sanityPreviewTokenHash}
        and consumed_at is null`,
    web`select set_config('app.preview_token_hash', ${replaySanityPreviewSessionTokenHash}, true)`,
    web`select set_config('app.preview_session_token_hash', '', true)`,
    web`select document_id
      from app.sanity_content_preview_grants
      where session_token_hash = ${replaySanityPreviewSessionTokenHash}`,
  ]);
  assert.deepEqual(
    replayedSanityPreview[6],
    [],
    "a Sanity preview grant must be consumed at most once",
  );

  const exactSanityPreview = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewSessionTokenHash}, true)`,
    web`select document_id, revision_id, locale, slug, path
      from app.sanity_content_preview_grants`,
  ]);
  assert.deepEqual(exactSanityPreview[2], [
    {
      document_id: "blog-post-security-test",
      revision_id: "sanityRevisionOne",
      locale: "en",
      slug: "security-test",
      path: "/blog/security-test",
    },
  ]);

  const activationTokenAfterSanityConsumption = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select set_config('app.preview_token_hash', ${sanityPreviewTokenHash}, true)`,
    web`select document_id from app.sanity_content_preview_grants`,
  ]);
  assert.deepEqual(
    activationTokenAfterSanityConsumption[2],
    [],
    "a consumed Sanity activation token must not retain preview access",
  );

  const reservedProviderCommand = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`insert into app.content_provider_commands (
      id,
      organization_id,
      actor_user_id,
      session_id,
      action,
      target_id,
      request_fingerprint
    ) values (
      ${ids.contentProviderCommand},
      ${ids.organizationA},
      ${ids.adminUser},
      ${ids.activeAdminSession},
      'blog_post.save',
      'blog-post-security-test',
      ${"a".repeat(64)}
    ) returning id, status`,
  });
  assert.deepEqual(reservedProviderCommand, [
    {
      id: ids.contentProviderCommand,
      status: "reserved",
    },
  ]);

  const crossTenantProviderCommands = await withAdminContext({
    organizationId: ids.organizationB,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id from app.content_provider_commands
      where id = ${ids.contentProviderCommand}`,
  });
  assert.deepEqual(
    crossTenantProviderCommands,
    [],
    "content provider commands must be tenant isolated",
  );

  const otherEditorProviderCommands = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.otherUser,
    membershipRole: "editor",
    query: admin`select id from app.content_provider_commands
      where id = ${ids.contentProviderCommand}`,
  });
  assert.deepEqual(
    otherEditorProviderCommands,
    [],
    "editors must not read another actor's provider commands",
  );

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`update app.content_provider_commands
        set target_id = 'tampered'
        where id = ${ids.contentProviderCommand}`,
    ]),
    "provider-command immutable-column update",
  );
  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`delete from app.content_provider_commands
        where id = ${ids.contentProviderCommand}`,
    ]),
    "provider-command deletion",
  );

  for (const [label, client] of [
    ["public", publicReader],
    ["web", web],
  ]) {
    await expectDenied(
      client`select request_fingerprint from app.content_provider_commands`,
      `${label} content-provider command read`,
    );
  }

  await expectDenied(
    publicReader`select id from auth.user`,
    "public auth-schema read",
  );
  await expectDenied(
    publicReader`select organization_id from app.organization_settings`,
    "public organization-settings read",
  );
  await expectDenied(
    publicReader`insert into app.lead_submissions (
      command_id,
      organization_id,
      kind,
      name,
      email,
      message,
      request_fingerprint
    ) values (
      ${randomUUID()},
      ${ids.organizationA},
      'contact',
      'Denied',
      'denied@example.test',
      'Denied',
      'denied'
    )`,
    "public lead write",
  );

  await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`insert into app.lead_submissions (
      id,
      command_id,
      organization_id,
      kind,
      name,
      email,
      message,
      request_fingerprint
    ) values (
      ${ids.allowedLead},
      ${ids.allowedLead},
      ${ids.organizationA},
      'contact',
      'Allowed',
      'allowed@example.test',
      'Allowed',
      'allowed-fingerprint'
    )`,
    web`insert into app.outbox_events (
      id,
      organization_id,
      lead_id,
      event_type,
      idempotency_key
    ) values (
      ${ids.allowedOutbox},
      ${ids.organizationA},
      ${ids.allowedLead},
      'lead.notification.requested',
      ${`security-lead/${ids.allowedLead}`}
    )`,
  ]);

  const receipt = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`select id, command_id, request_fingerprint
      from app.lead_submissions
      where id = ${ids.allowedLead}`,
  ]);
  assert.deepEqual(receipt[1], [
    {
      id: ids.allowedLead,
      command_id: ids.allowedLead,
      request_fingerprint: "allowed-fingerprint",
    },
  ]);

  const replay = await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`insert into app.lead_submissions (
      id,
      command_id,
      organization_id,
      kind,
      name,
      email,
      message,
      request_fingerprint
    ) values (
      ${ids.allowedLead},
      ${ids.allowedLead},
      ${ids.organizationA},
      'contact',
      'Changed replay',
      'changed@example.test',
      'Changed replay',
      'changed-fingerprint'
    )
    on conflict (command_id) do nothing
    returning id`,
    web`insert into app.outbox_events (
      id,
      organization_id,
      lead_id,
      event_type,
      idempotency_key
    ) values (
      ${randomUUID()},
      ${ids.organizationA},
      ${ids.allowedLead},
      'lead.notification.requested',
      ${`security-lead/${ids.allowedLead}`}
    )
    on conflict do nothing`,
    web`select id, request_fingerprint
      from app.lead_submissions
      where command_id = ${ids.allowedLead}`,
  ]);
  assert.deepEqual(replay[1], []);
  assert.deepEqual(replay[2], []);
  assert.deepEqual(replay[3], [
    {
      id: ids.allowedLead,
      request_fingerprint: "allowed-fingerprint",
    },
  ]);

  const outboxReplayCount = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select count(*)::integer as count
      from app.outbox_events
      where idempotency_key = ${`security-lead/${ids.allowedLead}`}`,
  });
  assert.deepEqual(outboxReplayCount, [{ count: 1 }]);

  await expectDenied(
    web`select email from app.lead_submissions`,
    "web lead personal-data read",
  );
  await expectDenied(
    web`select organization_id from app.organization_settings`,
    "web organization-settings read",
  );
  await expectDenied(web`select id from app.outbox_events`, "web outbox read");

  await expectDenied(
    web.transaction([
      web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      web`insert into app.lead_submissions (
        command_id,
        organization_id,
        kind,
        name,
        email,
        message,
        request_fingerprint
      ) values (
        ${randomUUID()},
        ${ids.organizationB},
        'contact',
        'Cross tenant',
        'cross-tenant@example.test',
        'Denied',
        'cross-tenant'
      )`,
    ]),
    "cross-tenant lead write",
  );
}

async function verifyWebhookIdempotencyAndOrdering() {
  const providerMessageId = `provider-${runId}`;
  const deliveredAt = "2026-07-24T12:00:00.000Z";
  const sentAt = "2026-07-24T11:59:00.000Z";

  await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`update app.outbox_events
      set
        provider_message_id = ${providerMessageId},
        status = 'sent',
        processed_at = now()
      where id = ${ids.allowedOutbox}`,
    admin`insert into app.provider_webhook_events (
      id,
      organization_id,
      provider,
      event_type,
      provider_message_id,
      body_hash,
      occurred_at
    ) values (
      ${ids.deliveredWebhook},
      ${ids.organizationA},
      'resend',
      'email.delivered',
      ${providerMessageId},
      'delivered-hash',
      ${deliveredAt}::timestamptz
    )`,
    admin`update app.outbox_events
      set
        delivery_status = 'email.delivered',
        delivery_occurred_at = ${deliveredAt}::timestamptz
      where provider_message_id = ${providerMessageId}
        and (
          delivery_occurred_at is null
          or delivery_occurred_at <= ${deliveredAt}::timestamptz
        )`,
    admin`insert into app.provider_webhook_events (
      id,
      organization_id,
      provider,
      event_type,
      provider_message_id,
      body_hash,
      occurred_at
    ) values (
      ${ids.sentWebhook},
      ${ids.organizationA},
      'resend',
      'email.sent',
      ${providerMessageId},
      'sent-hash',
      ${sentAt}::timestamptz
    )`,
    admin`update app.outbox_events
      set
        delivery_status = 'email.sent',
        delivery_occurred_at = ${sentAt}::timestamptz
      where provider_message_id = ${providerMessageId}
        and (
          delivery_occurred_at is null
          or delivery_occurred_at <= ${sentAt}::timestamptz
        )`,
  ]);

  const duplicate = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`insert into app.provider_webhook_events (
      id,
      organization_id,
      provider,
      event_type,
      provider_message_id,
      body_hash,
      occurred_at
    ) values (
      ${ids.deliveredWebhook},
      ${ids.organizationA},
      'resend',
      'email.delivered',
      ${providerMessageId},
      'delivered-hash',
      ${deliveredAt}::timestamptz
    )
    on conflict (id) do nothing
    returning id`,
    admin`select delivery_status, delivery_occurred_at
      from app.outbox_events
      where id = ${ids.allowedOutbox}`,
  ]);

  assert.deepEqual(duplicate[3], []);
  assert.equal(duplicate[4][0].delivery_status, "email.delivered");
  assert.equal(
    new Date(duplicate[4][0].delivery_occurred_at).toISOString(),
    deliveredAt,
  );
}

async function verifySyntheticRetentionPolicy() {
  await fixtureAdmin.transaction([
    fixtureAdmin`insert into app.lead_submissions (
      id,
      command_id,
      organization_id,
      kind,
      name,
      email,
      message,
      payload,
      request_fingerprint,
      created_at
    ) values
      (
        ${ids.expiredSyntheticLead},
        ${ids.expiredSyntheticLead},
        ${ids.organizationA},
        'contact',
        'Checkly Synthetic Monitor',
        'synthetic-monitor@shapewebs.invalid',
        'Synthetic staging reliability check. Safe to delete.',
        '{"company":"CHECKLY_SYNTHETIC_DO_NOT_CONTACT"}'::jsonb,
        'expired-synthetic',
        now() - interval '7 days'
      ),
      (
        ${ids.freshSyntheticLead},
        ${ids.freshSyntheticLead},
        ${ids.organizationA},
        'contact',
        'Checkly Synthetic Monitor',
        'synthetic-monitor@shapewebs.invalid',
        'Synthetic staging reliability check. Safe to delete.',
        '{"company":"CHECKLY_SYNTHETIC_DO_NOT_CONTACT"}'::jsonb,
        'fresh-synthetic',
        now() - interval '1 day'
      ),
      (
        ${ids.expiredOrdinaryLead},
        ${ids.expiredOrdinaryLead},
        ${ids.organizationA},
        'contact',
        'Real Lead',
        'real-lead@example.test',
        'This ordinary lead must never be deleted by synthetic retention.',
        '{}'::jsonb,
        'expired-ordinary',
        now() - interval '30 days'
      ),
      (
        ${ids.otherOrganizationSyntheticLead},
        ${ids.otherOrganizationSyntheticLead},
        ${ids.organizationB},
        'contact',
        'Checkly Synthetic Monitor',
        'synthetic-monitor@shapewebs.invalid',
        'Synthetic staging reliability check. Safe to delete.',
        '{"company":"CHECKLY_SYNTHETIC_DO_NOT_CONTACT"}'::jsonb,
        'other-organization-synthetic',
        now() - interval '7 days'
      )`,
    fixtureAdmin`insert into app.outbox_events (
      id,
      organization_id,
      lead_id,
      event_type,
      idempotency_key
    ) values (
      ${ids.expiredSyntheticOutbox},
      ${ids.organizationA},
      ${ids.expiredSyntheticLead},
      'lead.notification.requested',
      ${`security-retention/${ids.expiredSyntheticLead}`}
    )`,
  ]);

  const editorDelete = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "editor",
    query: admin`delete from app.lead_submissions
      where id = ${ids.expiredSyntheticLead}
      returning id`,
  });
  assert.deepEqual(editorDelete, [], "editors must not delete synthetic leads");

  const rejectedOwnerDeletes = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`delete from app.lead_submissions
      where id in (
        ${ids.freshSyntheticLead},
        ${ids.expiredOrdinaryLead},
        ${ids.otherOrganizationSyntheticLead}
      )
      returning id`,
  ]);
  assert.deepEqual(
    rejectedOwnerDeletes[3],
    [],
    "retention must preserve fresh, ordinary, and cross-tenant leads",
  );

  const deleted = await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`delete from app.outbox_events
      where organization_id = ${ids.organizationA}
        and lead_id = ${ids.expiredSyntheticLead}`,
    admin`delete from app.lead_submissions
      where id = ${ids.expiredSyntheticLead}
      returning id`,
  ]);
  assert.deepEqual(deleted[4], [{ id: ids.expiredSyntheticLead }]);

  await expectDenied(
    web.transaction([
      web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      web`delete from app.lead_submissions
        where id = ${ids.freshSyntheticLead}`,
    ]),
    "web synthetic retention",
  );
}

async function verifyAuditImmutability() {
  await admin.transaction([
    admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
    admin`select set_config('app.membership_role', 'owner', true)`,
    admin`insert into audit.events (
      id,
      organization_id,
      actor_user_id,
      action,
      target_type
    ) values (
      ${ids.auditEvent},
      ${ids.organizationA},
      ${ids.adminUser},
      'security.test',
      'test'
    )`,
  ]);

  const events = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.adminUser,
    membershipRole: "owner",
    query: admin`select id from audit.events where id = ${ids.auditEvent}`,
  });
  assert.deepEqual(events, [{ id: ids.auditEvent }]);

  await expectDenied(
    admin.transaction([
      admin`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      admin`select set_config('app.user_id', ${ids.adminUser}, true)`,
      admin`select set_config('app.membership_role', 'owner', true)`,
      admin`update audit.events set action = 'mutated' where id = ${ids.auditEvent}`,
    ]),
    "audit update",
  );
}

try {
  await seed();
  await verifyRoleAttributes();
  await verifyRlsCoverage();
  await verifyAdminSessionAssurance();
  await verifyAdminTotpAssurance();
  await verifyAdminAuthEmailIsolation();
  await verifyAdminSessionManagement();
  await verifyAdminIsolation();
  await verifyPortalIsolation();
  await verifyMediaIsolation();
  await verifyCustomerCredentialOnboarding();
  await verifyPublicAndWebBoundaries();
  await verifySyntheticRetentionPolicy();
  await verifyWebhookIdempotencyAndOrdering();
  await verifyAuditImmutability();
  console.log(
    "Database security verified: role flags, forced RLS, separate administrative and customer identity stores, mutually isolated admin and portal runtimes, one-time invitation exchange, mailbox-proofed credential activation, provisional-password replacement, invitation-gated Google activation, replay denial, exact customer project assignment, active-customer project authorization, cross-tenant denial, admin session expiry/revocation/inactivity/role/step-up assurance, absolute-lifetime-preserving token rotation, organization-scoped session listing and owner revocation, one-time TOTP counters and lockout, tenant-isolated durable administrative auth email, owner-only organization settings, tenant-isolated CMS reads, private-media isolation, public-ready media projection, restricted media metadata, locale-specific publication pointers, exact public revisions, single-use tenant-bound Neon and Sanity preview grants, tenant-isolated provider commands, restricted public metadata, idempotent lead/outbox writes, strict synthetic retention, ordered webhook state, and audit immutability.",
  );
} finally {
  await cleanup();
}
