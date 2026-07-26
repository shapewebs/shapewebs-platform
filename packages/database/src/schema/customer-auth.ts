import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const customerAuthSchema = pgSchema("customer_auth");

export const customerAuthEmailKind = customerAuthSchema.enum(
  "auth_email_kind",
  ["invitation", "email_verification", "password_reset"],
);

export const customerAuthEmailStatus = customerAuthSchema.enum(
  "auth_email_status",
  ["pending", "processing", "sent", "permanent_failure"],
);

export const customerUser = customerAuthSchema.table("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const customerSession = customerAuthSchema.table(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => customerUser.id, { onDelete: "cascade" }),
  },
  (table) => [index("customer_session_userId_idx").on(table.userId)],
);

export const customerAccount = customerAuthSchema.table(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => customerUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("customer_account_userId_idx").on(table.userId)],
);

export const customerVerification = customerAuthSchema.table(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("customer_verification_identifier_idx").on(table.identifier),
  ],
);

export const customerRateLimit = customerAuthSchema.table("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const customerSessionSecurity = customerAuthSchema.table(
  "session_security",
  {
    sessionId: text("session_id")
      .primaryKey()
      .references(() => customerSession.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => customerUser.id, { onDelete: "cascade" }),
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
  (table) => [index("customer_session_security_user_idx").on(table.userId)],
);

export const customerAuthEmailOutbox = customerAuthSchema.table(
  "auth_email_outbox",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    invitationId: uuid("invitation_id"),
    userId: text("user_id").references(() => customerUser.id, {
      onDelete: "cascade",
    }),
    kind: customerAuthEmailKind("kind").notNull(),
    recipient: text("recipient").notNull(),
    tokenHash: text("token_hash").notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    status: customerAuthEmailStatus("status").default("pending").notNull(),
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
    uniqueIndex("customer_auth_email_token_hash_unique").on(table.tokenHash),
    uniqueIndex("customer_auth_email_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("customer_auth_email_delivery_idx").on(
      table.organizationId,
      table.status,
      table.nextAttemptAt,
    ),
    index("customer_auth_email_recipient_idx").on(
      table.organizationId,
      table.recipient,
      table.createdAt,
    ),
    check(
      "customer_auth_email_attempts_nonnegative",
      sql`${table.attempts} >= 0`,
    ),
    check(
      "customer_auth_email_recipient_normalized",
      sql`${table.recipient} = lower(btrim(${table.recipient}))`,
    ),
    check(
      "customer_auth_email_token_hash_format",
      sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const customerUserRelations = relations(customerUser, ({ many }) => ({
  sessions: many(customerSession),
  accounts: many(customerAccount),
  authEmailOutbox: many(customerAuthEmailOutbox),
  sessionSecurity: many(customerSessionSecurity),
}));

export const customerSessionRelations = relations(
  customerSession,
  ({ one }) => ({
    user: one(customerUser, {
      fields: [customerSession.userId],
      references: [customerUser.id],
    }),
  }),
);

export const customerAccountRelations = relations(
  customerAccount,
  ({ one }) => ({
    user: one(customerUser, {
      fields: [customerAccount.userId],
      references: [customerUser.id],
    }),
  }),
);
