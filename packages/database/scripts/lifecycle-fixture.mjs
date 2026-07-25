import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_OWNER_URL;
const command = process.argv[2];
const exportPath = process.env.LIFECYCLE_EXPORT_PATH;
const expectedHash = process.env.EXPECTED_FIXTURE_HASH;

if (!databaseUrl) {
  throw new Error("DATABASE_OWNER_URL is required.");
}

if (!["export", "restore", "seed", "verify"].includes(command)) {
  throw new Error(
    "Expected one of: lifecycle-fixture.mjs seed|verify|export|restore.",
  );
}

if (["export", "restore"].includes(command) && !exportPath) {
  throw new Error("LIFECYCLE_EXPORT_PATH is required for export and restore.");
}

const sql = neon(databaseUrl);

const fixture = {
  version: 3,
  users: [
    {
      id: "lifecycle-owner",
      name: "Lifecycle Owner",
      email: "lifecycle-owner@example.test",
      emailVerified: true,
      twoFactorEnabled: true,
    },
    {
      id: "lifecycle-customer",
      name: "Lifecycle Customer",
      email: "lifecycle-customer@example.test",
      emailVerified: true,
      twoFactorEnabled: false,
    },
  ],
  organizations: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      slug: "lifecycle-studio",
      name: "Lifecycle Studio",
      active: true,
    },
  ],
  organizationSettings: [
    {
      organizationId: "10000000-0000-4000-8000-000000000001",
      locales: [
        { code: "en", isDefault: true, label: "English" },
        { code: "da-DK", isDefault: false, label: "Dansk" },
      ],
      regionProfiles: [
        {
          code: "eea_uk_ch",
          displayName: "EEA / UK / CH",
          ruleSetKey: "eea_uk_ch",
        },
        {
          code: "rest_of_world",
          displayName: "Rest of world",
          ruleSetKey: "rest_of_world",
        },
      ],
      featureFlags: [
        { enabled: false, key: "cms.scheduled_publishing" },
        { enabled: true, key: "web.region_sensitive_consent" },
      ],
      consentRuleSets: [
        { defaultMode: "opt_in", key: "eea_uk_ch" },
        { defaultMode: "inform", key: "rest_of_world" },
      ],
      cookiePolicyVersions: ["v1-eea", "v1-global"],
    },
  ],
  memberships: [
    {
      organizationId: "10000000-0000-4000-8000-000000000001",
      userId: "lifecycle-customer",
      role: "customer",
      status: "active",
    },
    {
      organizationId: "10000000-0000-4000-8000-000000000001",
      userId: "lifecycle-owner",
      role: "owner",
      status: "active",
    },
  ],
  projects: [
    {
      id: "10000000-0000-4000-8000-000000000002",
      organizationId: "10000000-0000-4000-8000-000000000001",
      slug: "lifecycle-project",
      name: "Lifecycle Project",
      status: "in_progress",
      websiteUrl: "https://lifecycle.example.test",
      summary: "Synthetic recovery fixture",
    },
  ],
  projectMemberships: [
    {
      projectId: "10000000-0000-4000-8000-000000000002",
      userId: "lifecycle-customer",
    },
  ],
  projectUpdates: [
    {
      id: "10000000-0000-4000-8000-000000000003",
      projectId: "10000000-0000-4000-8000-000000000002",
      title: "Recovery checkpoint",
      body: "Synthetic customer-visible update",
      visibleToCustomer: true,
      createdByUserId: "lifecycle-owner",
    },
  ],
  contentDocuments: [
    {
      id: "10000000-0000-4000-8000-000000000004",
      organizationId: "10000000-0000-4000-8000-000000000001",
      kind: "method",
      slug: "lifecycle-method",
      status: "review",
      createdByUserId: "lifecycle-owner",
      publishedAt: null,
    },
  ],
  contentRevisions: [
    {
      id: "10000000-0000-4000-8000-000000000005",
      documentId: "10000000-0000-4000-8000-000000000004",
      revisionNumber: 1,
      locale: "en",
      title: "Lifecycle method",
      summary: "Synthetic review revision",
      payload: { blocks: [{ type: "paragraph", text: "Recovery fixture" }] },
      seo: { description: "Synthetic recovery fixture" },
      createdByUserId: "lifecycle-owner",
      publishedAt: null,
    },
  ],
  leads: [
    {
      id: "10000000-0000-4000-8000-000000000006",
      commandId: "10000000-0000-4000-8000-000000000006",
      organizationId: "10000000-0000-4000-8000-000000000001",
      kind: "contact",
      status: "new",
      name: "Lifecycle Lead",
      email: "lifecycle-lead@example.test",
      message: "Synthetic lead retained through recovery",
      payload: { source: "lifecycle-test" },
      requestFingerprint: "lifecycle-fixture-v3",
    },
  ],
  files: [
    {
      id: "10000000-0000-4000-8000-000000000007",
      organizationId: "10000000-0000-4000-8000-000000000001",
      storageKey: "lifecycle/recovery-fixture.txt",
      visibility: "private",
      mimeType: "text/plain",
      byteSize: 32,
      originalName: "recovery-fixture.txt",
      uploadedByUserId: "lifecycle-owner",
    },
  ],
  auditEvents: [
    {
      id: "10000000-0000-4000-8000-000000000008",
      organizationId: "10000000-0000-4000-8000-000000000001",
      actorUserId: "lifecycle-owner",
      action: "lifecycle.fixture.created",
      targetType: "lifecycle_test",
      targetId: "fixture-v3",
      requestId: "lifecycle-request-v3",
      metadata: { synthetic: true },
      occurredAt: "2026-01-01T00:00:00.000Z",
    },
  ],
};

const timestamp = "2026-01-01T00:00:00.000Z";

function fixtureHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function cleanupFixture() {
  await sql.transaction([
    sql`delete from audit.events
      where id = ${fixture.auditEvents[0].id}`,
    sql`delete from app.lead_submissions
      where id = ${fixture.leads[0].id}`,
    sql`delete from app.files
      where id = ${fixture.files[0].id}`,
    sql`delete from app.organizations
      where id = ${fixture.organizations[0].id}`,
    sql`delete from auth.user
      where id in (${fixture.users[0].id}, ${fixture.users[1].id})`,
  ]);
}

async function seedFixture(value) {
  assert.deepEqual(
    value,
    fixture,
    "Only the reviewed synthetic fixture is valid",
  );

  const [owner, customer] = value.users;
  const [organization] = value.organizations;
  const [organizationSetting] = value.organizationSettings;
  const [customerMembership, ownerMembership] = value.memberships;
  const [project] = value.projects;
  const [projectMembership] = value.projectMemberships;
  const [projectUpdate] = value.projectUpdates;
  const [document] = value.contentDocuments;
  const [revision] = value.contentRevisions;
  const [lead] = value.leads;
  const [file] = value.files;
  const [auditEvent] = value.auditEvents;

  await cleanupFixture();
  await sql.transaction([
    sql`insert into auth.user (
        id,
        name,
        email,
        email_verified,
        created_at,
        updated_at,
        two_factor_enabled
      )
      values
        (
          ${owner.id},
          ${owner.name},
          ${owner.email},
          ${owner.emailVerified},
          ${timestamp}::timestamp,
          ${timestamp}::timestamp,
          ${owner.twoFactorEnabled}
        ),
        (
          ${customer.id},
          ${customer.name},
          ${customer.email},
          ${customer.emailVerified},
          ${timestamp}::timestamp,
          ${timestamp}::timestamp,
          ${customer.twoFactorEnabled}
        )`,
    sql`insert into app.organizations (
        id,
        slug,
        name,
        active,
        created_at,
        updated_at
      )
      values (
        ${organization.id},
        ${organization.slug},
        ${organization.name},
        ${organization.active},
        ${timestamp}::timestamptz,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.organization_settings (
        organization_id,
        locales,
        region_profiles,
        feature_flags,
        consent_rule_sets,
        cookie_policy_versions,
        updated_at
      )
      values (
        ${organizationSetting.organizationId},
        ${JSON.stringify(organizationSetting.locales)}::jsonb,
        ${JSON.stringify(organizationSetting.regionProfiles)}::jsonb,
        ${JSON.stringify(organizationSetting.featureFlags)}::jsonb,
        ${JSON.stringify(organizationSetting.consentRuleSets)}::jsonb,
        ${JSON.stringify(organizationSetting.cookiePolicyVersions)}::jsonb,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.memberships (
        organization_id,
        user_id,
        role,
        status,
        created_at,
        updated_at
      )
      values
        (
          ${customerMembership.organizationId},
          ${customerMembership.userId},
          ${customerMembership.role},
          ${customerMembership.status},
          ${timestamp}::timestamptz,
          ${timestamp}::timestamptz
        ),
        (
          ${ownerMembership.organizationId},
          ${ownerMembership.userId},
          ${ownerMembership.role},
          ${ownerMembership.status},
          ${timestamp}::timestamptz,
          ${timestamp}::timestamptz
        )`,
    sql`insert into app.projects (
        id,
        organization_id,
        slug,
        name,
        status,
        website_url,
        summary,
        created_at,
        updated_at
      )
      values (
        ${project.id},
        ${project.organizationId},
        ${project.slug},
        ${project.name},
        ${project.status},
        ${project.websiteUrl},
        ${project.summary},
        ${timestamp}::timestamptz,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.project_memberships (
        project_id,
        user_id,
        created_at
      )
      values (
        ${projectMembership.projectId},
        ${projectMembership.userId},
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.project_updates (
        id,
        project_id,
        title,
        body,
        visible_to_customer,
        created_by_user_id,
        created_at,
        updated_at
      )
      values (
        ${projectUpdate.id},
        ${projectUpdate.projectId},
        ${projectUpdate.title},
        ${projectUpdate.body},
        ${projectUpdate.visibleToCustomer},
        ${projectUpdate.createdByUserId},
        ${timestamp}::timestamptz,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.content_documents (
        id,
        organization_id,
        kind,
        slug,
        status,
        created_by_user_id,
        published_at,
        created_at,
        updated_at
      )
      values (
        ${document.id},
        ${document.organizationId},
        ${document.kind},
        ${document.slug},
        ${document.status},
        ${document.createdByUserId},
        ${document.publishedAt}::timestamptz,
        ${timestamp}::timestamptz,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.content_revisions (
        id,
        document_id,
        revision_number,
        locale,
        title,
        summary,
        payload,
        seo,
        created_by_user_id,
        published_at,
        created_at
      )
      values (
        ${revision.id},
        ${revision.documentId},
        ${revision.revisionNumber},
        ${revision.locale},
        ${revision.title},
        ${revision.summary},
        ${JSON.stringify(revision.payload)}::jsonb,
        ${JSON.stringify(revision.seo)}::jsonb,
        ${revision.createdByUserId},
        ${revision.publishedAt}::timestamptz,
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.lead_submissions (
        id,
        command_id,
        organization_id,
        kind,
        status,
        name,
        email,
        message,
        payload,
        request_fingerprint,
        created_at
      )
      values (
        ${lead.id},
        ${lead.commandId},
        ${lead.organizationId},
        ${lead.kind},
        ${lead.status},
        ${lead.name},
        ${lead.email},
        ${lead.message},
        ${JSON.stringify(lead.payload)}::jsonb,
        ${lead.requestFingerprint},
        ${timestamp}::timestamptz
      )`,
    sql`insert into app.files (
        id,
        organization_id,
        storage_key,
        visibility,
        mime_type,
        byte_size,
        original_name,
        uploaded_by_user_id,
        created_at
      )
      values (
        ${file.id},
        ${file.organizationId},
        ${file.storageKey},
        ${file.visibility},
        ${file.mimeType},
        ${file.byteSize},
        ${file.originalName},
        ${file.uploadedByUserId},
        ${timestamp}::timestamptz
      )`,
    sql`insert into audit.events (
        id,
        organization_id,
        actor_user_id,
        action,
        target_type,
        target_id,
        request_id,
        metadata,
        occurred_at
      )
      values (
        ${auditEvent.id},
        ${auditEvent.organizationId},
        ${auditEvent.actorUserId},
        ${auditEvent.action},
        ${auditEvent.targetType},
        ${auditEvent.targetId},
        ${auditEvent.requestId},
        ${JSON.stringify(auditEvent.metadata)}::jsonb,
        ${auditEvent.occurredAt}::timestamptz
      )`,
  ]);
}

async function readFixture() {
  const [
    users,
    organizations,
    organizationSettings,
    memberships,
    projects,
    projectMemberships,
    projectUpdates,
    contentDocuments,
    contentRevisions,
    leads,
    files,
    auditEvents,
  ] = await Promise.all([
    sql`select
        id,
        name,
        email,
        email_verified,
        two_factor_enabled
      from auth.user
      where id in (${fixture.users[0].id}, ${fixture.users[1].id})
      order by id desc`,
    sql`select id, slug, name, active
      from app.organizations
      where id = ${fixture.organizations[0].id}`,
    sql`select
        organization_id,
        locales,
        region_profiles,
        feature_flags,
        consent_rule_sets,
        cookie_policy_versions
      from app.organization_settings
      where organization_id = ${fixture.organizationSettings[0].organizationId}`,
    sql`select organization_id, user_id, role, status
      from app.memberships
      where organization_id = ${fixture.organizations[0].id}
      order by user_id`,
    sql`select
        id,
        organization_id,
        slug,
        name,
        status,
        website_url,
        summary
      from app.projects
      where id = ${fixture.projects[0].id}`,
    sql`select project_id, user_id
      from app.project_memberships
      where project_id = ${fixture.projects[0].id}`,
    sql`select
        id,
        project_id,
        title,
        body,
        visible_to_customer,
        created_by_user_id
      from app.project_updates
      where id = ${fixture.projectUpdates[0].id}`,
    sql`select
        id,
        organization_id,
        kind,
        slug,
        status,
        created_by_user_id,
        published_at
      from app.content_documents
      where id = ${fixture.contentDocuments[0].id}`,
    sql`select
        id,
        document_id,
        revision_number,
        locale,
        title,
        summary,
        payload,
        seo,
        created_by_user_id,
        published_at
      from app.content_revisions
      where id = ${fixture.contentRevisions[0].id}`,
    sql`select
        id,
        command_id,
        organization_id,
        kind,
        status,
        name,
        email,
        message,
        payload,
        request_fingerprint
      from app.lead_submissions
      where id = ${fixture.leads[0].id}`,
    sql`select
        id,
        organization_id,
        storage_key,
        visibility,
        mime_type,
        byte_size,
        original_name,
        uploaded_by_user_id
      from app.files
      where id = ${fixture.files[0].id}`,
    sql`select
        id,
        organization_id,
        actor_user_id,
        action,
        target_type,
        target_id,
        request_id,
        metadata,
        occurred_at
      from audit.events
      where id = ${fixture.auditEvents[0].id}`,
  ]);

  return {
    version: 3,
    users: users.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      emailVerified: row.email_verified,
      twoFactorEnabled: row.two_factor_enabled,
    })),
    organizations: organizations.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      active: row.active,
    })),
    organizationSettings: organizationSettings.map((row) => ({
      organizationId: row.organization_id,
      locales: row.locales,
      regionProfiles: row.region_profiles,
      featureFlags: row.feature_flags,
      consentRuleSets: row.consent_rule_sets,
      cookiePolicyVersions: row.cookie_policy_versions,
    })),
    memberships: memberships.map((row) => ({
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role,
      status: row.status,
    })),
    projects: projects.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      websiteUrl: row.website_url,
      summary: row.summary,
    })),
    projectMemberships: projectMemberships.map((row) => ({
      projectId: row.project_id,
      userId: row.user_id,
    })),
    projectUpdates: projectUpdates.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      body: row.body,
      visibleToCustomer: row.visible_to_customer,
      createdByUserId: row.created_by_user_id,
    })),
    contentDocuments: contentDocuments.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      kind: row.kind,
      slug: row.slug,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      publishedAt:
        row.published_at === null
          ? null
          : new Date(row.published_at).toISOString(),
    })),
    contentRevisions: contentRevisions.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      revisionNumber: row.revision_number,
      locale: row.locale,
      title: row.title,
      summary: row.summary,
      payload: row.payload,
      seo: row.seo,
      createdByUserId: row.created_by_user_id,
      publishedAt:
        row.published_at === null
          ? null
          : new Date(row.published_at).toISOString(),
    })),
    leads: leads.map((row) => ({
      id: row.id,
      commandId: row.command_id,
      organizationId: row.organization_id,
      kind: row.kind,
      status: row.status,
      name: row.name,
      email: row.email,
      message: row.message,
      payload: row.payload,
      requestFingerprint: row.request_fingerprint,
    })),
    files: files.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      storageKey: row.storage_key,
      visibility: row.visibility,
      mimeType: row.mime_type,
      byteSize: row.byte_size,
      originalName: row.original_name,
      uploadedByUserId: row.uploaded_by_user_id,
    })),
    auditEvents: auditEvents.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      requestId: row.request_id,
      metadata: row.metadata,
      occurredAt: new Date(row.occurred_at).toISOString(),
    })),
  };
}

async function verifyFixture() {
  const actual = await readFixture();
  assert.deepEqual(actual, fixture, "The synthetic lifecycle fixture changed");
  const hash = fixtureHash(actual);

  if (expectedHash) {
    assert.equal(
      hash,
      expectedHash,
      "The restored fixture hash does not match",
    );
  }

  console.log(`Lifecycle fixture verified: sha256=${hash}`);
  return { actual, hash };
}

if (command === "seed") {
  await seedFixture(fixture);
  await verifyFixture();
}

if (command === "verify") {
  await verifyFixture();
}

if (command === "export") {
  const { actual, hash } = await verifyFixture();
  // The path is an operator-created temporary file outside the repository.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(exportPath, `${JSON.stringify(actual, null, 2)}\n`, {
    mode: 0o600,
  });
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  chmodSync(exportPath, 0o600);
  console.log(`Synthetic lifecycle export created: sha256=${hash}`);
}

if (command === "restore") {
  // The path is an operator-created temporary file outside the repository.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const restoredFixture = JSON.parse(readFileSync(exportPath, "utf8"));
  assert.deepEqual(
    restoredFixture,
    fixture,
    "The logical export is not the reviewed synthetic fixture",
  );
  await seedFixture(restoredFixture);
  await verifyFixture();
}
