import { relations, sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgPolicy,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { authSchema, session, user } from "./auth";
import { organizations } from "./application";
import { adminRuntimeRole, migratorRole } from "./roles";

const currentOrganizationId = sql`nullif(current_setting('app.organization_id', true), '')::uuid`;

export const adminAuthEmailKind = authSchema.enum("auth_email_kind", [
  "invitation",
  "email_verification",
  "password_reset",
]);

export const adminAuthEmailStatus = authSchema.enum("auth_email_status", [
  "pending",
  "processing",
  "sent",
  "permanent_failure",
]);

export const adminAuthEmailOutbox = authSchema.table(
  "auth_email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitationId: uuid("invitation_id"),
    userId: text("user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    kind: adminAuthEmailKind("kind").notNull(),
    recipient: text("recipient").notNull(),
    tokenHash: text("token_hash").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: adminAuthEmailStatus("status").default("pending").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("admin_auth_email_token_hash_unique").on(table.tokenHash),
    uniqueIndex("admin_auth_email_idempotency_unique").on(table.idempotencyKey),
    index("admin_auth_email_delivery_idx").on(
      table.organizationId,
      table.status,
      table.nextAttemptAt,
    ),
    index("admin_auth_email_recipient_idx").on(
      table.organizationId,
      table.recipient,
      table.createdAt,
    ),
    check("admin_auth_email_attempts_nonnegative", sql`${table.attempts} >= 0`),
    check(
      "admin_auth_email_recipient_normalized",
      sql`${table.recipient} = lower(btrim(${table.recipient}))`,
    ),
    check(
      "admin_auth_email_token_hash_format",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
    pgPolicy("admin runtime manages auth email in current organization", {
      for: "all",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}`,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}`,
    }),
    pgPolicy("migrator manages canonical auth email", {
      for: "all",
      to: migratorRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

export const adminSessionSecurity = authSchema.table(
  "admin_session_security",
  {
    sessionId: text("session_id")
      .primaryKey()
      .references(() => session.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    stepUpVerifiedAt: timestamp("step_up_verified_at", {
      withTimezone: true,
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("admin_session_security_user_idx").on(table.userId),
    index("admin_session_security_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const unifiedCustomerSessionSecurity = authSchema.table(
  "customer_session_security",
  {
    sessionId: text("session_id")
      .primaryKey()
      .references(() => session.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("customer_session_security_user_idx").on(table.userId),
    index("customer_session_security_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const legacyCustomerIdentityMap = authSchema.table(
  "legacy_customer_identity_map",
  {
    legacyCustomerUserId: text("legacy_customer_user_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    migratedAt: timestamp("migrated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("legacy_customer_identity_map_user_idx").on(table.userId)],
);

export const adminTotpSecurity = authSchema.table(
  "admin_totp_security",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    lastAcceptedCounter: bigint("last_accepted_counter", {
      mode: "number",
    }),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("admin_totp_security_locked_idx").on(table.lockedUntil)],
);

export const adminSessionSecurityRelations = relations(
  adminSessionSecurity,
  ({ one }) => ({
    session: one(session, {
      fields: [adminSessionSecurity.sessionId],
      references: [session.id],
    }),
    user: one(user, {
      fields: [adminSessionSecurity.userId],
      references: [user.id],
    }),
  }),
);

export const unifiedCustomerSessionSecurityRelations = relations(
  unifiedCustomerSessionSecurity,
  ({ one }) => ({
    session: one(session, {
      fields: [unifiedCustomerSessionSecurity.sessionId],
      references: [session.id],
    }),
    user: one(user, {
      fields: [unifiedCustomerSessionSecurity.userId],
      references: [user.id],
    }),
  }),
);

export const adminTotpSecurityRelations = relations(
  adminTotpSecurity,
  ({ one }) => ({
    user: one(user, {
      fields: [adminTotpSecurity.userId],
      references: [user.id],
    }),
  }),
);

export const adminAuthEmailOutboxRelations = relations(
  adminAuthEmailOutbox,
  ({ one }) => ({
    user: one(user, {
      fields: [adminAuthEmailOutbox.userId],
      references: [user.id],
    }),
  }),
);
