import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  adminRuntimeRole,
  migratorRole,
  publicReaderRole,
  webRuntimeRole,
} from "./roles";
import { user } from "./auth";
import type { OrganizationSettingsValue } from "@shapewebs/validation";

export const appSchema = pgSchema("app");

export const membershipRole = appSchema.enum("membership_role", [
  "owner",
  "editor",
  "customer",
]);

export const membershipStatus = appSchema.enum("membership_status", [
  "invited",
  "active",
  "suspended",
]);

export const projectStatus = appSchema.enum("project_status", [
  "planned",
  "in_progress",
  "review",
  "launched",
  "paused",
  "archived",
]);

export const contentKind = appSchema.enum("content_kind", [
  "page",
  "post",
  "project",
  "service",
  "legal",
]);

export const contentStatus = appSchema.enum("content_status", [
  "draft",
  "published",
  "archived",
]);

export const leadKind = appSchema.enum("lead_kind", [
  "contact",
  "project_inquiry",
]);

export const leadStatus = appSchema.enum("lead_status", [
  "new",
  "reviewed",
  "qualified",
  "closed",
  "spam",
]);

export const outboxStatus = appSchema.enum("outbox_status", [
  "pending",
  "processing",
  "sent",
  "permanent_failure",
]);

const currentOrganizationId = sql`nullif(current_setting('app.organization_id', true), '')::uuid`;
const currentUserId = sql`nullif(current_setting('app.user_id', true), '')`;
const currentMembershipRole = sql`nullif(current_setting('app.membership_role', true), '')`;
const isOwner = sql`${currentMembershipRole} = 'owner'`;
const isEditorOrOwner = sql`${currentMembershipRole} in ('owner', 'editor')`;
const projectBelongsToCurrentOrganization = (projectId: unknown) =>
  sql`app.project_belongs_to_current_organization(${projectId})`;
const currentUserHasProjectAccess = (projectId: unknown) =>
  sql`app.current_user_has_project_access(${projectId})`;

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const organizations = appSchema.table(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("organizations_slug_unique").on(table.slug),
    check(
      "organizations_slug_format",
      sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    pgPolicy("admin runtime reads current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.id} = ${currentOrganizationId}`,
    }),
    pgPolicy("owner updates current organization", {
      for: "update",
      to: adminRuntimeRole,
      using: sql`${table.id} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.id} = ${currentOrganizationId} and ${isOwner}`,
    }),
  ],
);

export const organizationSettings = appSchema.table(
  "organization_settings",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locales: jsonb("locales")
      .$type<OrganizationSettingsValue["locales"]>()
      .notNull(),
    regionProfiles: jsonb("region_profiles")
      .$type<OrganizationSettingsValue["regionProfiles"]>()
      .notNull(),
    featureFlags: jsonb("feature_flags")
      .$type<OrganizationSettingsValue["featureFlags"]>()
      .notNull(),
    consentRuleSets: jsonb("consent_rule_sets")
      .$type<OrganizationSettingsValue["consentRuleSets"]>()
      .notNull(),
    cookiePolicyVersions: jsonb("cookie_policy_versions")
      .$type<OrganizationSettingsValue["cookiePolicyVersions"]>()
      .notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "organization_settings_locales_array",
      sql`jsonb_typeof(${table.locales}) = 'array'`,
    ),
    check(
      "organization_settings_region_profiles_array",
      sql`jsonb_typeof(${table.regionProfiles}) = 'array'`,
    ),
    check(
      "organization_settings_feature_flags_array",
      sql`jsonb_typeof(${table.featureFlags}) = 'array'`,
    ),
    check(
      "organization_settings_consent_rule_sets_array",
      sql`jsonb_typeof(${table.consentRuleSets}) = 'array'`,
    ),
    check(
      "organization_settings_cookie_policy_versions_array",
      sql`jsonb_typeof(${table.cookiePolicyVersions}) = 'array'`,
    ),
    pgPolicy("owner reads current organization settings", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("owner manages current organization settings", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
  ],
);

export const memberships = appSchema.table(
  "memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: membershipRole("role").notNull(),
    status: membershipStatus("status").default("invited").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.userId],
      name: "memberships_pkey",
    }),
    index("memberships_user_idx").on(table.userId),
    pgPolicy("members read memberships in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and (${isEditorOrOwner} or ${table.userId} = ${currentUserId})`,
    }),
    pgPolicy("owner inserts memberships in current organization", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("owner updates memberships in current organization", {
      for: "update",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("owner deletes memberships in current organization", {
      for: "delete",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
  ],
);

export const projects = appSchema.table(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: projectStatus("status").default("planned").notNull(),
    websiteUrl: text("website_url"),
    summary: text("summary"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("projects_organization_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
    index("projects_organization_status_idx").on(
      table.organizationId,
      table.status,
    ),
    pgPolicy("authorized members read projects in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and (
          ${isEditorOrOwner}
          or (
            ${currentMembershipRole} = 'customer'
            and ${currentUserHasProjectAccess(table.id)}
          )
        )`,
    }),
    pgPolicy("editors manage projects in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("migrator reads projects for policy evaluation", {
      for: "select",
      to: migratorRole,
      using: sql`true`,
    }),
  ],
);

export const projectMemberships = appSchema.table(
  "project_memberships",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.userId],
      name: "project_memberships_pkey",
    }),
    index("project_memberships_user_idx").on(table.userId),
    pgPolicy("authorized members read project assignments", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`(
        ${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}
      ) or (
        ${currentMembershipRole} = 'customer'
        and ${table.userId} = ${currentUserId}
        and ${currentUserHasProjectAccess(table.projectId)}
      )`,
    }),
    pgPolicy("editors manage project assignments", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
      withCheck: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
    pgPolicy("migrator reads project assignments for policy evaluation", {
      for: "select",
      to: migratorRole,
      using: sql`true`,
    }),
  ],
);

export const projectUpdates = appSchema.table(
  "project_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibleToCustomer: boolean("visible_to_customer").default(false).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("project_updates_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    pgPolicy("authorized members read project updates", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${projectBelongsToCurrentOrganization(table.projectId)} and (
        ${isEditorOrOwner}
        or (
          ${currentMembershipRole} = 'customer'
          and ${table.visibleToCustomer}
          and ${currentUserHasProjectAccess(table.projectId)}
        )
      )`,
    }),
    pgPolicy("editors manage updates for current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
      withCheck: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
  ],
);

export const contentDocuments = appSchema.table(
  "content_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: contentKind("kind").notNull(),
    slug: text("slug").notNull(),
    status: contentStatus("status").default("draft").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("content_documents_organization_kind_slug_unique").on(
      table.organizationId,
      table.kind,
      table.slug,
    ),
    index("content_documents_publication_idx").on(
      table.status,
      table.publishedAt,
    ),
    pgPolicy("admins read content in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors manage content in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("public reader reads published content", {
      for: "select",
      to: publicReaderRole,
      using: sql`${table.status} = 'published' and ${table.publishedAt} is not null`,
    }),
    pgPolicy("web runtime reads published content", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.status} = 'published' and ${table.publishedAt} is not null`,
    }),
  ],
);

export const contentRevisions = appSchema.table(
  "content_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => contentDocuments.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    seo: jsonb("seo").$type<Record<string, unknown>>().default({}).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("content_revisions_document_revision_locale_unique").on(
      table.documentId,
      table.revisionNumber,
      table.locale,
    ),
    index("content_revisions_document_created_idx").on(
      table.documentId,
      table.createdAt,
    ),
    check(
      "content_revisions_revision_positive",
      sql`${table.revisionNumber} > 0`,
    ),
    pgPolicy("admins read revisions in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner} and exists (
        select 1
        from ${contentDocuments}
        where ${contentDocuments.id} = ${table.documentId}
          and ${contentDocuments.organizationId} = ${currentOrganizationId}
      )`,
    }),
    pgPolicy("editors insert immutable revisions", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${isEditorOrOwner} and ${table.createdByUserId} = ${currentUserId} and exists (
        select 1
        from ${contentDocuments}
        where ${contentDocuments.id} = ${table.documentId}
          and ${contentDocuments.organizationId} = ${currentOrganizationId}
      )`,
    }),
    pgPolicy("public reader reads published revisions", {
      for: "select",
      to: publicReaderRole,
      using: sql`${table.publishedAt} is not null and exists (
        select 1
        from ${contentDocuments}
        where ${contentDocuments.id} = ${table.documentId}
          and ${contentDocuments.status} = 'published'
      )`,
    }),
    pgPolicy("web runtime reads published revisions", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.publishedAt} is not null and exists (
        select 1
        from ${contentDocuments}
        where ${contentDocuments.id} = ${table.documentId}
          and ${contentDocuments.status} = 'published'
      )`,
    }),
  ],
);

export const leadSubmissions = appSchema.table(
  "lead_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commandId: uuid("command_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    kind: leadKind("kind").notNull(),
    status: leadStatus("status").default("new").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    sourceIpHash: text("source_ip_hash"),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdAt: createdAt(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("lead_submissions_command_unique").on(table.commandId),
    index("lead_submissions_organization_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    pgPolicy("admins read leads in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors update leads in current organization", {
      for: "update",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("owners delete expired synthetic leads", {
      for: "delete",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${isOwner}
        and ${table.kind} = 'contact'
        and ${table.name} = 'Checkly Synthetic Monitor'
        and lower(${table.email}) = 'synthetic-monitor@shapewebs.invalid'
        and ${table.message} = 'Synthetic staging reliability check. Safe to delete.'
        and ${table.payload}->>'company' = 'CHECKLY_SYNTHETIC_DO_NOT_CONTACT'
        and ${table.createdAt} < now() - interval '6 days'`,
    }),
    pgPolicy("web runtime inserts leads for configured organization", {
      for: "insert",
      to: webRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}`,
    }),
    pgPolicy("web runtime reads its lead receipts", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}`,
    }),
  ],
);

export const outboxEvents = appSchema.table(
  "outbox_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leadSubmissions.id, { onDelete: "restrict" }),
    eventType: text("event_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: outboxStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    providerMessageId: text("provider_message_id"),
    deliveryStatus: text("delivery_status"),
    deliveryOccurredAt: timestamp("delivery_occurred_at", {
      withTimezone: true,
    }),
    lastErrorCode: text("last_error_code"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("outbox_events_idempotency_unique").on(table.idempotencyKey),
    index("outbox_events_pending_idx").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("outbox_events_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    index("outbox_events_provider_message_idx").on(table.providerMessageId),
    check("outbox_events_attempts_nonnegative", sql`${table.attempts} >= 0`),
    pgPolicy("admins manage outbox in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("web runtime inserts lead outbox events", {
      for: "insert",
      to: webRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.eventType} = 'lead.notification.requested'
        and exists (
          select 1
          from ${leadSubmissions}
          where ${leadSubmissions.id} = ${table.leadId}
            and ${leadSubmissions.organizationId} = ${currentOrganizationId}
        )`,
    }),
  ],
);

export const providerWebhookEvents = appSchema.table(
  "provider_webhook_events",
  {
    id: text("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(),
    providerMessageId: text("provider_message_id"),
    bodyHash: text("body_hash").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: createdAt(),
  },
  (table) => [
    index("provider_webhook_message_occurred_idx").on(
      table.providerMessageId,
      table.occurredAt,
    ),
    pgPolicy("admins read provider webhook events", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("admin runtime inserts provider webhook events", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.provider} = 'resend'`,
    }),
  ],
);

export const files = appSchema.table(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    visibility: text("visibility").$type<"public" | "private">().notNull(),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    originalName: text("original_name").notNull(),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("files_storage_key_unique").on(table.storageKey),
    check("files_byte_size_positive", sql`${table.byteSize} > 0`),
    check(
      "files_visibility_valid",
      sql`${table.visibility} in ('public', 'private')`,
    ),
    pgPolicy("admins read files in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors insert files in current organization", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner} and ${table.uploadedByUserId} = ${currentUserId}`,
    }),
    pgPolicy("editors delete files in current organization", {
      for: "delete",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
  ],
);
