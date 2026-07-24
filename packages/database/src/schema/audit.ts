import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgPolicy,
  pgSchema,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { adminRuntimeRole } from "./roles";

export const auditSchema = pgSchema("audit");

const currentOrganizationId = sql`nullif(current_setting('app.organization_id', true), '')::uuid`;
const currentUserId = sql`nullif(current_setting('app.user_id', true), '')`;
const currentMembershipRole = sql`nullif(current_setting('app.membership_role', true), '')`;

export const auditEvents = auditSchema.table(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    requestId: text("request_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_organization_occurred_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("audit_events_actor_occurred_idx").on(
      table.actorUserId,
      table.occurredAt,
    ),
    pgPolicy("runtime inserts its own audit events", {
      for: "insert",
      to: adminRuntimeRole,
      withCheck: sql`${table.organizationId} = ${currentOrganizationId}
        and (${table.actorUserId} is null or ${table.actorUserId} = ${currentUserId})`,
    }),
    pgPolicy("owner reads audit events in current organization", {
      for: "select",
      to: adminRuntimeRole,
      using: sql`${table.organizationId} = ${currentOrganizationId}
        and ${currentMembershipRole} = 'owner'`,
    }),
  ],
);
