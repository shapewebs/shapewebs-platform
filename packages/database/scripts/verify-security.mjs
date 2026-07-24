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
  customerSession: `security-session-customer-${runId}`,
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
          ${ids.customerUser}
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
          ${ids.customerUser},
          now(),
          now(),
          null
        )`,
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
    fixtureAdmin`delete from app.provider_webhook_events
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
    fixtureAdmin`delete from app.outbox_events
      where organization_id in (${ids.organizationA}, ${ids.organizationB})`,
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
    admin`select set_config('app.membership_role', 'customer', true)`,
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
          from app.memberships
          where organization_id = ${organizationId}
            and user_id = ${userId}
            and status = 'active'
            and role in ('owner', 'editor')
        )
      returning security.step_up_verified_at`,
    admin`select role
      from app.memberships
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
    ["customer-role", ids.customerSession, ids.customerUser],
  ]) {
    assert.equal(
      await authorizeSyntheticAdminSession({ sessionId, userId }),
      null,
      `${label} session must fail closed`,
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
      ${ids.publishedDocumentB}
    )
    order by id
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
  await verifyAdminIsolation();
  await verifyPublicAndWebBoundaries();
  await verifySyntheticRetentionPolicy();
  await verifyWebhookIdempotencyAndOrdering();
  await verifyAuditImmutability();
  console.log(
    "Database security verified: role flags, RLS, admin session expiry/revocation/inactivity/role/step-up assurance, tenant isolation, public access, idempotent lead/outbox writes, strict synthetic retention, ordered webhook state, and audit immutability.",
  );
} finally {
  await cleanup();
}
