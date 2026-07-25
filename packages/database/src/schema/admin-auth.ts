import { relations } from "drizzle-orm";
import { bigint, index, integer, text, timestamp } from "drizzle-orm/pg-core";

import { authSchema, session, user } from "./auth";

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

export const adminTotpSecurityRelations = relations(
  adminTotpSecurity,
  ({ one }) => ({
    user: one(user, {
      fields: [adminTotpSecurity.userId],
      references: [user.id],
    }),
  }),
);
