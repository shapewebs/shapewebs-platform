import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";

const {
  DATABASE_ADMIN_URL,
  DATABASE_MIGRATION_URL,
  DATABASE_OWNER_URL,
  DATABASE_PUBLIC_URL,
  DATABASE_WEB_URL,
} = process.env;

const requiredEnvironment = [
  ["DATABASE_ADMIN_URL", DATABASE_ADMIN_URL],
  ["DATABASE_MIGRATION_URL", DATABASE_MIGRATION_URL],
  ["DATABASE_OWNER_URL", DATABASE_OWNER_URL],
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
const publicReader = neon(DATABASE_PUBLIC_URL);
const web = neon(DATABASE_WEB_URL);

const runId = randomUUID();
const ids = {
  adminUser: `security-admin-${runId}`,
  customerUser: `security-customer-${runId}`,
  otherUser: `security-other-${runId}`,
  organizationA: randomUUID(),
  organizationB: randomUUID(),
  assignedProject: randomUUID(),
  unassignedProject: randomUUID(),
  otherOrganizationProject: randomUUID(),
  visibleUpdate: randomUUID(),
  hiddenUpdate: randomUUID(),
  draftDocument: randomUUID(),
  publishedDocumentA: randomUUID(),
  publishedDocumentB: randomUUID(),
  auditEvent: randomUUID(),
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

async function seed() {
  await fixtureAdmin.transaction([
    fixtureAdmin`insert into auth.user (id, name, email, email_verified, created_at, updated_at)
      values
        (${ids.adminUser}, 'Security Admin', ${`security-admin-${runId}@example.test`}, true, now(), now()),
        (${ids.customerUser}, 'Security Customer', ${`security-customer-${runId}@example.test`}, true, now(), now()),
        (${ids.otherUser}, 'Security Other', ${`security-other-${runId}@example.test`}, true, now(), now())`,
    fixtureAdmin`insert into app.organizations (id, slug, name)
      values
        (${ids.organizationA}, ${`security-a-${runId}`}, 'Security Organization A'),
        (${ids.organizationB}, ${`security-b-${runId}`}, 'Security Organization B')`,
    fixtureAdmin`insert into app.memberships (organization_id, user_id, role, status)
      values
        (${ids.organizationA}, ${ids.adminUser}, 'owner', 'active'),
        (${ids.organizationB}, ${ids.adminUser}, 'owner', 'active'),
        (${ids.organizationA}, ${ids.customerUser}, 'customer', 'active'),
        (${ids.organizationB}, ${ids.otherUser}, 'customer', 'active')`,
    fixtureAdmin`insert into app.projects (id, organization_id, slug, name, status)
      values
        (${ids.assignedProject}, ${ids.organizationA}, 'assigned', 'Assigned Project', 'in_progress'),
        (${ids.unassignedProject}, ${ids.organizationA}, 'unassigned', 'Unassigned Project', 'planned'),
        (${ids.otherOrganizationProject}, ${ids.organizationB}, 'other-org', 'Other Organization Project', 'review')`,
    fixtureAdmin`insert into app.project_memberships (project_id, user_id)
      values (${ids.assignedProject}, ${ids.customerUser})`,
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
        (${ids.publishedDocumentB}, ${ids.organizationB}, 'page', 'published-b', 'published', ${ids.adminUser}, now())`,
  ]);
}

async function cleanup() {
  await fixtureAdmin.transaction([
    fixtureAdmin`delete from audit.events
      where id = ${ids.auditEvent}`,
    fixtureAdmin`delete from app.lead_submissions
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.organizations
      where id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from auth.user
      where id in (${ids.adminUser}, ${ids.customerUser}, ${ids.otherUser})`,
  ]);
}

async function verifyRoleAttributes() {
  const roles = await migrator`
    select
      rolname,
      rolsuper,
      rolcreaterole,
      rolcreatedb,
      rolbypassrls,
      pg_has_role(rolname, 'neon_superuser', 'member') as neon_superuser_member
    from pg_roles
    where rolname in (
      'shapewebs_admin_runtime',
      'shapewebs_migrator',
      'shapewebs_public_reader',
      'shapewebs_web_runtime'
    )
  `;

  assert.equal(roles.length, 4);
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
  }
}

async function verifyRlsCoverage() {
  const uncovered = await migrator`
    select namespace.nspname as schemaname, relation.relname as tablename
    from pg_class as relation
    inner join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('app', 'audit')
      and relation.relkind = 'r'
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  `;
  assert.deepEqual(
    uncovered,
    [],
    "Every app and audit table must enable and force RLS",
  );
}

async function verifyAdminIsolation() {
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
  assert.deepEqual(customerProjects, [{ id: ids.assignedProject }]);

  const customerUpdates = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.project_updates`,
  });
  assert.deepEqual(customerUpdates, [{ id: ids.visibleUpdate }]);

  const customerMemberships = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select user_id from app.memberships`,
  });
  assert.deepEqual(customerMemberships, [{ user_id: ids.customerUser }]);

  const customerDrafts = await withAdminContext({
    organizationId: ids.organizationA,
    userId: ids.customerUser,
    membershipRole: "customer",
    query: admin`select id from app.content_documents`,
  });
  assert.deepEqual(customerDrafts, []);
}

async function verifyPublicAndWebBoundaries() {
  const publicDocuments = await publicReader`
    select id from app.content_documents order by id
  `;
  assert.deepEqual(
    new Set(publicDocuments.map(({ id }) => id)),
    new Set([ids.publishedDocumentA, ids.publishedDocumentB]),
  );

  await expectDenied(
    publicReader`select id from auth.user`,
    "public auth-schema read",
  );
  await expectDenied(
    publicReader`insert into app.lead_submissions (
      organization_id,
      kind,
      name,
      email,
      message
    ) values (
      ${ids.organizationA},
      'contact',
      'Denied',
      'denied@example.test',
      'Denied'
    )`,
    "public lead write",
  );

  await web.transaction([
    web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
    web`insert into app.lead_submissions (
      organization_id,
      kind,
      name,
      email,
      message
    ) values (
      ${ids.organizationA},
      'contact',
      'Allowed',
      'allowed@example.test',
      'Allowed'
    )`,
  ]);

  await expectDenied(
    web.transaction([
      web`select set_config('app.organization_id', ${ids.organizationA}, true)`,
      web`insert into app.lead_submissions (
        organization_id,
        kind,
        name,
        email,
        message
      ) values (
        ${ids.organizationB},
        'contact',
        'Cross tenant',
        'cross-tenant@example.test',
        'Denied'
      )`,
    ]),
    "cross-tenant lead write",
  );

  await expectDenied(web`select id from app.lead_submissions`, "web lead read");
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
  await verifyAdminIsolation();
  await verifyPublicAndWebBoundaries();
  await verifyAuditImmutability();
  console.log(
    "Database security verified: role flags, RLS, tenant isolation, public access, lead writes, and audit immutability.",
  );
} finally {
  await cleanup();
}
