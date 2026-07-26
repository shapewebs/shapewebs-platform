import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
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
  portalRuntimeRole,
  publicReaderRole,
  webRuntimeRole,
} from "./roles";
import { user as adminUser } from "./auth";
import { customerUser } from "./customer-auth";
import type { OrganizationSettingsValue } from "@shapewebs/validation";

export const appSchema = pgSchema("app");

export const staffMembershipRole = appSchema.enum("staff_membership_role", [
  "owner",
  "editor",
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
  "method",
  "legal",
]);

export const contentStatus = appSchema.enum("content_status", [
  "draft",
  "review",
  "scheduled",
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

export const mediaFileStatus = appSchema.enum("media_file_status", [
  "pending",
  "ready",
  "failed",
  "cleanup_required",
]);

const currentOrganizationId = sql`nullif(current_setting('app.organization_id', true), '')::uuid`;
const currentUserId = sql`nullif(current_setting('app.user_id', true), '')`;
const currentMembershipRole = sql`nullif(current_setting('app.membership_role', true), '')`;
const currentPreviewTokenHash = sql`nullif(current_setting('app.preview_token_hash', true), '')`;
const isOwner = sql`${currentMembershipRole} = 'owner'`;
const isEditorOrOwner = sql`${currentMembershipRole} in ('owner', 'editor')`;
const projectBelongsToCurrentOrganization = (projectId: unknown) =>
  sql`app.project_belongs_to_current_organization(${projectId})`;
const currentUserHasProjectAccess = (projectId: unknown) =>
  sql`app.current_user_has_project_access(${projectId})`;
const currentCustomerHasActiveMembership = sql`app.current_customer_has_active_membership()`;

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
    pgPolicy("portal runtime reads current customer organization", {
      for: "select",
      to: portalRuntimeRole,
      using: sql`${table.id} = ${currentOrganizationId}
        and ${currentMembershipRole} = 'customer'
        and ${currentCustomerHasActiveMembership}`,
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

export const staffMemberships = appSchema.table(
  "staff_memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "cascade" }),
    role: staffMembershipRole("role").notNull(),
    status: membershipStatus("status").default("invited").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => adminUser.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.userId],
      name: "staff_memberships_pkey",
    }),
    index("staff_memberships_user_idx").on(table.userId),
    pgPolicy("staff read staff memberships in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and (${isEditorOrOwner} or ${table.userId} = ${currentUserId})`,
    }),
    pgPolicy("owner inserts staff memberships in current organization", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("owner updates staff memberships in current organization", {
      for: "update",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("owner deletes staff memberships in current organization", {
      for: "delete",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
  ],
);

export const customerMemberships = appSchema.table(
  "customer_memberships",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => customerUser.id, { onDelete: "cascade" }),
    status: membershipStatus("status").default("invited").notNull(),
    invitedByUserId: text("invited_by_user_id").references(() => adminUser.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.organizationId, table.userId],
      name: "customer_memberships_pkey",
    }),
    index("customer_memberships_user_idx").on(table.userId),
    pgPolicy("staff read customer memberships in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("owner manages customer memberships in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
    }),
    pgPolicy("customers read their current organization membership", {
      for: "select",
      to: portalRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.userId} = ${currentUserId}
        and ${currentMembershipRole} = 'customer'`,
    }),
    pgPolicy("migrator reads customer memberships for policy evaluation", {
      for: "select",
      to: migratorRole,
      using: sql`true`,
    }),
  ],
);

export const customerInvitations = appSchema.table(
  "customer_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    invitationTokenHash: text("invitation_token_hash").notNull(),
    invitationTokenConsumedAt: timestamp("invitation_token_consumed_at", {
      withTimezone: true,
    }),
    registrationGrantHash: text("registration_grant_hash"),
    registrationGrantExpiresAt: timestamp("registration_grant_expires_at", {
      withTimezone: true,
    }),
    claimedUserId: text("claimed_user_id").references(() => customerUser.id, {
      onDelete: "set null",
    }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("customer_invitations_token_hash_unique").on(
      table.invitationTokenHash,
    ),
    uniqueIndex("customer_invitations_registration_grant_unique").on(
      table.registrationGrantHash,
    ),
    index("customer_invitations_organization_email_idx").on(
      table.organizationId,
      table.email,
    ),
    check(
      "customer_invitations_email_normalized",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
    check(
      "customer_invitations_email_bounded",
      sql`char_length(${table.email}) between 3 and 320`,
    ),
    check(
      "customer_invitations_name_bounded",
      sql`char_length(btrim(${table.name})) between 1 and 120`,
    ),
    check(
      "customer_invitations_token_hash_format",
      sql`${table.invitationTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "customer_invitations_registration_grant_complete",
      sql`(${table.registrationGrantHash} is null and ${table.registrationGrantExpiresAt} is null)
        or (${table.registrationGrantHash} ~ '^[0-9a-f]{64}$' and ${table.registrationGrantExpiresAt} is not null)`,
    ),
    check(
      "customer_invitations_claim_complete",
      sql`(${table.claimedUserId} is null and ${table.claimedAt} is null)
        or (${table.claimedUserId} is not null and ${table.claimedAt} is not null)`,
    ),
    pgPolicy("staff read customer invitations in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("owner manages customer invitations in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isOwner}`,
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
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("assigned customers read projects in current organization", {
      for: "select",
      to: portalRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${currentMembershipRole} = 'customer'
        and ${currentUserHasProjectAccess(table.id)}`,
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

export const customerProjectMemberships = appSchema.table(
  "customer_project_memberships",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => customerUser.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.projectId, table.userId],
      name: "customer_project_memberships_pkey",
    }),
    index("customer_project_memberships_user_idx").on(table.userId),
    pgPolicy("staff read customer project assignments", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
    pgPolicy("editors manage customer project assignments", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
      withCheck: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
    pgPolicy("customers read their project assignments", {
      for: "select",
      to: portalRuntimeRole,
      using: sql`${currentMembershipRole} = 'customer'
        and ${table.userId} = ${currentUserId}
        and ${currentUserHasProjectAccess(table.projectId)}`,
    }),
    pgPolicy(
      "migrator reads customer project assignments for policy evaluation",
      {
        for: "select",
        to: migratorRole,
        using: sql`true`,
      },
    ),
  ],
);

export const customerInvitationProjects = appSchema.table(
  "customer_invitation_projects",
  {
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => customerInvitations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.invitationId, table.projectId],
      name: "customer_invitation_projects_pkey",
    }),
    index("customer_invitation_projects_project_idx").on(table.projectId),
    pgPolicy("staff read customer invitation projects", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
    pgPolicy("owner manages customer invitation projects", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${isOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
      withCheck: sql`${isOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
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
      .references(() => adminUser.id, { onDelete: "restrict" }),
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
      using: sql`${isEditorOrOwner}
        and ${projectBelongsToCurrentOrganization(table.projectId)}`,
    }),
    pgPolicy("assigned customers read customer-visible project updates", {
      for: "select",
      to: portalRuntimeRole,
      using: sql`${currentMembershipRole} = 'customer'
        and ${table.visibleToCustomer}
        and ${currentUserHasProjectAccess(table.projectId)}`,
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
    defaultLocale: text("default_locale").default("en").notNull(),
    pageKind: text("page_kind"),
    version: integer("version").default(1).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "restrict" }),
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
    check(
      "content_documents_default_locale_supported",
      sql`${table.defaultLocale} in ('en', 'da-DK')`,
    ),
    check(
      "content_documents_page_kind_bounded",
      sql`${table.pageKind} is null or (
        char_length(${table.pageKind}) between 1 and 80
        and ${table.pageKind} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
      )`,
    ),
    check("content_documents_version_positive", sql`${table.version} > 0`),
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
      using: sql`exists (
        select 1
        from "app"."content_localizations" as localization
        where localization."document_id" = ${table.id}
          and localization."published_revision_id" is not null
          and localization."published_at" is not null
      )`,
    }),
    pgPolicy("web runtime reads published content", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and (
          exists (
            select 1
            from "app"."content_localizations" as localization
            where localization."document_id" = ${table.id}
              and localization."organization_id" = ${currentOrganizationId}
              and localization."published_revision_id" is not null
              and localization."published_at" is not null
          )
          or exists (
            select 1
            from "app"."content_preview_grants" as preview_grant
            where preview_grant."document_id" = ${table.id}
              and preview_grant."organization_id" = ${currentOrganizationId}
              and preview_grant."session_token_hash" = ${currentPreviewTokenHash}
              and preview_grant."consumed_at" is not null
              and preview_grant."expires_at" > now()
          )
        )`,
    }),
  ],
);

export const contentLocalizations = appSchema.table(
  "content_localizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => contentDocuments.id, { onDelete: "cascade" }),
    kind: contentKind("kind").notNull(),
    locale: text("locale").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    seo: jsonb("seo").$type<Record<string, unknown>>().default({}).notNull(),
    publishedRevisionId: uuid("published_revision_id").references(
      (): AnyPgColumn => contentRevisions.id,
      { onDelete: "restrict" },
    ),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("content_localizations_document_locale_unique").on(
      table.documentId,
      table.locale,
    ),
    uniqueIndex(
      "content_localizations_organization_kind_locale_slug_unique",
    ).on(table.organizationId, table.kind, table.locale, table.slug),
    index("content_localizations_document_updated_idx").on(
      table.documentId,
      table.updatedAt,
    ),
    index("content_localizations_publication_idx").on(
      table.publishedRevisionId,
      table.publishedAt,
    ),
    check(
      "content_localizations_locale_supported",
      sql`${table.locale} in ('en', 'da-DK')`,
    ),
    check(
      "content_localizations_slug_format",
      sql`char_length(${table.slug}) between 1 and 180
        and ${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "content_localizations_title_bounded",
      sql`char_length(${table.title}) between 1 and 140`,
    ),
    check(
      "content_localizations_summary_bounded",
      sql`${table.summary} is null or char_length(${table.summary}) <= 320`,
    ),
    check(
      "content_localizations_seo_object",
      sql`jsonb_typeof(${table.seo}) = 'object'`,
    ),
    check(
      "content_localizations_publication_consistent",
      sql`(
        ${table.publishedRevisionId} is null
        and ${table.publishedAt} is null
      ) or (
        ${table.publishedRevisionId} is not null
        and ${table.publishedAt} is not null
      )`,
    ),
    pgPolicy("admins read localizations in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors manage localizations in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}
        and exists (
          select 1
          from ${contentDocuments}
          where ${contentDocuments.id} = ${table.documentId}
            and ${contentDocuments.organizationId} = ${table.organizationId}
            and ${contentDocuments.kind} = ${table.kind}
        )
        and (
          (
            ${table.publishedRevisionId} is null
            and ${table.publishedAt} is null
          )
          or exists (
            select 1
            from "app"."content_revisions" as revision
            where revision."id" = ${table.publishedRevisionId}
              and revision."document_id" = ${table.documentId}
              and revision."locale" = ${table.locale}
              and revision."published_at" is not null
          )
        )`,
    }),
    pgPolicy("public reader reads published localization pointers", {
      for: "select",
      to: publicReaderRole,
      using: sql`${table.publishedRevisionId} is not null and ${table.publishedAt} is not null`,
    }),
    pgPolicy("web runtime reads published localization pointers", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.publishedRevisionId} is not null
        and ${table.publishedAt} is not null`,
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
    commandId: uuid("command_id").notNull(),
    revisionNumber: integer("revision_number").notNull(),
    locale: text("locale").notNull(),
    status: contentStatus("status").default("draft").notNull(),
    slug: text("slug").notNull(),
    pageKind: text("page_kind"),
    title: text("title").notNull(),
    summary: text("summary"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    seo: jsonb("seo").$type<Record<string, unknown>>().default({}).notNull(),
    changeNote: text("change_note"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("content_revisions_document_revision_locale_unique").on(
      table.documentId,
      table.revisionNumber,
      table.locale,
    ),
    uniqueIndex("content_revisions_command_unique").on(table.commandId),
    index("content_revisions_document_created_idx").on(
      table.documentId,
      table.createdAt,
    ),
    check(
      "content_revisions_revision_positive",
      sql`${table.revisionNumber} > 0`,
    ),
    check(
      "content_revisions_locale_supported",
      sql`${table.locale} in ('en', 'da-DK')`,
    ),
    check(
      "content_revisions_slug_format",
      sql`char_length(${table.slug}) between 1 and 180
        and ${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`,
    ),
    check(
      "content_revisions_page_kind_bounded",
      sql`${table.pageKind} is null or (
        char_length(${table.pageKind}) between 1 and 80
        and ${table.pageKind} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
      )`,
    ),
    check(
      "content_revisions_title_bounded",
      sql`char_length(${table.title}) between 1 and 140`,
    ),
    check(
      "content_revisions_summary_bounded",
      sql`${table.summary} is null or char_length(${table.summary}) <= 320`,
    ),
    check(
      "content_revisions_payload_object",
      sql`jsonb_typeof(${table.payload}) = 'object'`,
    ),
    check(
      "content_revisions_seo_object",
      sql`jsonb_typeof(${table.seo}) = 'object'`,
    ),
    check(
      "content_revisions_change_note_bounded",
      sql`${table.changeNote} is null or char_length(${table.changeNote}) <= 240`,
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
        from ${contentLocalizations}
        where ${contentLocalizations.documentId} = ${table.documentId}
          and ${contentLocalizations.locale} = ${table.locale}
          and ${contentLocalizations.publishedRevisionId} = ${table.id}
          and ${contentLocalizations.publishedAt} is not null
      )`,
    }),
    pgPolicy("web runtime reads published revisions", {
      for: "select",
      to: webRuntimeRole,
      using: sql`(
        ${table.publishedAt} is not null
        and exists (
          select 1
          from ${contentLocalizations}
          where ${contentLocalizations.documentId} = ${table.documentId}
            and ${contentLocalizations.organizationId} = ${currentOrganizationId}
            and ${contentLocalizations.locale} = ${table.locale}
            and ${contentLocalizations.publishedRevisionId} = ${table.id}
            and ${contentLocalizations.publishedAt} is not null
        )
      ) or exists (
        select 1
        from "app"."content_preview_grants" as preview_grant
        where preview_grant."revision_id" = ${table.id}
          and preview_grant."document_id" = ${table.documentId}
          and preview_grant."locale" = ${table.locale}
          and preview_grant."organization_id" = ${currentOrganizationId}
          and preview_grant."session_token_hash" = ${currentPreviewTokenHash}
          and preview_grant."consumed_at" is not null
          and preview_grant."expires_at" > now()
      )`,
    }),
  ],
);

export const contentPreviewGrants = appSchema.table(
  "content_preview_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => contentDocuments.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => contentRevisions.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    path: text("path").notNull(),
    tokenHash: text("token_hash").notNull(),
    sessionTokenHash: text("session_token_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("content_preview_grants_token_hash_unique").on(table.tokenHash),
    uniqueIndex("content_preview_grants_session_token_hash_unique").on(
      table.sessionTokenHash,
    ),
    index("content_preview_grants_expiry_idx").on(table.expiresAt),
    index("content_preview_grants_document_revision_idx").on(
      table.documentId,
      table.revisionId,
    ),
    check(
      "content_preview_grants_locale_supported",
      sql`${table.locale} in ('en', 'da-DK')`,
    ),
    check(
      "content_preview_grants_path_safe",
      sql`char_length(${table.path}) between 1 and 240
        and left(${table.path}, 1) = '/'
        and left(${table.path}, 2) <> '//'
        and strpos(${table.path}, chr(92)) = 0
        and ${table.path} !~ '[[:cntrl:]]'`,
    ),
    check(
      "content_preview_grants_token_hash_format",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "content_preview_grants_session_token_hash_format",
      sql`${table.sessionTokenHash} is null or ${table.sessionTokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "content_preview_grants_expiry_bounded",
      sql`${table.expiresAt} > ${table.createdAt}
        and ${table.expiresAt} <= ${table.createdAt} + interval '30 minutes'`,
    ),
    check(
      "content_preview_grants_consumption_bounded",
      sql`(
        ${table.consumedAt} is null
        and ${table.sessionTokenHash} is null
      ) or (
        ${table.consumedAt} is not null
        and ${table.sessionTokenHash} is not null
        and ${table.consumedAt} >= ${table.createdAt}
        and ${table.consumedAt} < ${table.expiresAt}
      )`,
    ),
    pgPolicy("editors create preview grants", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.createdByUserId} = ${currentUserId}
        and ${isEditorOrOwner}
        and ${table.consumedAt} is null
        and ${table.sessionTokenHash} is null
        and exists (
          select 1
          from ${contentDocuments}
          where ${contentDocuments.id} = ${table.documentId}
            and ${contentDocuments.organizationId} = ${table.organizationId}
        )
        and exists (
          select 1
          from ${contentRevisions}
          where ${contentRevisions.id} = ${table.revisionId}
            and ${contentRevisions.documentId} = ${table.documentId}
            and ${contentRevisions.locale} = ${table.locale}
        )`,
    }),
    pgPolicy("editors read current organization preview grants", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${isEditorOrOwner}`,
    }),
    pgPolicy("web runtime reads exact preview grant", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.expiresAt} > now()
        and (
          (
            ${table.tokenHash} = ${currentPreviewTokenHash}
            and ${table.createdAt} > now() - interval '5 minutes'
          )
          or (
            ${table.sessionTokenHash} = ${currentPreviewTokenHash}
            and ${table.consumedAt} is not null
          )
        )`,
    }),
    pgPolicy("web runtime consumes fresh preview grant", {
      for: "update",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.tokenHash} = ${currentPreviewTokenHash}
        and ${table.consumedAt} is null
        and ${table.expiresAt} > now()
        and ${table.createdAt} > now() - interval '5 minutes'`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.tokenHash} = ${currentPreviewTokenHash}
        and ${table.consumedAt} is not null
        and ${table.sessionTokenHash} is not null
        and ${table.expiresAt} > now()`,
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
    status: mediaFileStatus("status").default("ready").notNull(),
    storageProvider: text("storage_provider").default("legacy").notNull(),
    storeId: text("store_id"),
    storageUrl: text("storage_url"),
    storageEtag: text("storage_etag"),
    mimeType: text("mime_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    originalByteSize: integer("original_byte_size"),
    sha256: text("sha256"),
    width: integer("width"),
    height: integer("height"),
    originalName: text("original_name").notNull(),
    failureCode: text("failure_code"),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => adminUser.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("files_storage_key_unique").on(table.storageKey),
    index("files_organization_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    check("files_byte_size_positive", sql`${table.byteSize} > 0`),
    check(
      "files_original_byte_size_positive",
      sql`${table.originalByteSize} is null or ${table.originalByteSize} > 0`,
    ),
    check(
      "files_visibility_valid",
      sql`${table.visibility} in ('public', 'private')`,
    ),
    check(
      "files_storage_provider_valid",
      sql`${table.storageProvider} in ('legacy', 'vercel_blob')`,
    ),
    check(
      "files_storage_key_bounded",
      sql`char_length(${table.storageKey}) between 1 and 512
        and ${table.storageKey} !~ '[[:cntrl:]]'
        and ${table.storageKey} not like '/%'
        and ${table.storageKey} not like '%..%'`,
    ),
    check(
      "files_original_name_bounded",
      sql`char_length(${table.originalName}) between 1 and 180
        and ${table.originalName} !~ '[[:cntrl:]/\\\\]'`,
    ),
    check(
      "files_mime_type_bounded",
      sql`char_length(${table.mimeType}) between 3 and 120`,
    ),
    check(
      "files_image_dimensions_consistent",
      sql`(
        ${table.width} is null
        and ${table.height} is null
      ) or (
        ${table.width} between 1 and 8192
        and ${table.height} between 1 and 8192
      )`,
    ),
    check(
      "files_sha256_format",
      sql`${table.sha256} is null or ${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "files_failure_code_bounded",
      sql`${table.failureCode} is null
        or char_length(${table.failureCode}) between 3 and 80`,
    ),
    check(
      "files_vercel_blob_state_consistent",
      sql`(
        ${table.storageProvider} = 'legacy'
        and ${table.status} = 'ready'
        and ${table.storeId} is null
        and ${table.storageUrl} is null
        and ${table.storageEtag} is null
        and ${table.originalByteSize} is null
        and ${table.sha256} is null
        and ${table.width} is null
        and ${table.height} is null
        and ${table.failureCode} is null
      ) or (
        ${table.storageProvider} = 'vercel_blob'
        and char_length(${table.storeId}) between 8 and 128
        and ${table.storeId} !~ '[[:cntrl:][:space:]]'
        and ${table.originalByteSize} is not null
        and ${table.sha256} is not null
        and ${table.width} is not null
        and ${table.height} is not null
        and (
          (
            ${table.status} in ('pending', 'failed')
            and ${table.storageUrl} is null
            and ${table.storageEtag} is null
          ) or (
            ${table.status} in ('ready', 'cleanup_required')
            and char_length(${table.storageUrl}) between 20 and 2048
            and char_length(${table.storageEtag}) between 1 and 256
          )
        )
        and (
          (
            ${table.status} in ('pending', 'ready')
            and ${table.failureCode} is null
          ) or (
            ${table.status} in ('failed', 'cleanup_required')
            and ${table.failureCode} is not null
          )
        )
      )`,
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
    pgPolicy("editors update files in current organization", {
      for: "update",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors delete files in current organization", {
      for: "delete",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("web runtime reads ready public files", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${table.visibility} = 'public'
        and ${table.status} = 'ready'`,
    }),
  ],
);

export const fileLocalizations = appSchema.table(
  "file_localizations",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({
      columns: [table.fileId, table.locale],
      name: "file_localizations_file_locale_pk",
    }),
    index("file_localizations_organization_locale_idx").on(
      table.organizationId,
      table.locale,
    ),
    check(
      "file_localizations_locale_supported",
      sql`${table.locale} in ('en', 'da-DK')`,
    ),
    check(
      "file_localizations_alt_text_bounded",
      sql`char_length(${table.altText}) between 1 and 180`,
    ),
    check(
      "file_localizations_caption_bounded",
      sql`${table.caption} is null or char_length(${table.caption}) <= 280`,
    ),
    pgPolicy("admins read file localizations in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
    }),
    pgPolicy("editors manage file localizations in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId} and ${isEditorOrOwner}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and ${isEditorOrOwner}
        and exists (
          select 1
          from ${files}
          where ${files.id} = ${table.fileId}
            and ${files.organizationId} = ${table.organizationId}
        )`,
    }),
    pgPolicy("web runtime reads ready public file localizations", {
      for: "select",
      to: webRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and exists (
          select 1
          from ${files}
          where ${files.id} = ${table.fileId}
            and ${files.organizationId} = ${table.organizationId}
            and ${files.visibility} = 'public'
            and ${files.status} = 'ready'
        )`,
    }),
  ],
);
