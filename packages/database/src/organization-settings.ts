import "server-only";

import { eq, sql } from "drizzle-orm";
import {
  organizationSettingsValueSchema,
  type OrganizationSettingsValue,
} from "@shapewebs/validation";

import type { AdminAuthorizationContext } from "./admin-auth";
import { createDatabase } from "./client";
import { organizationSettings } from "./schema";
import { createDefaultOrganizationSettingsValue } from "./settings-defaults";

export type OrganizationSettingsSnapshot = OrganizationSettingsValue & {
  source: "default" | "neon";
};

export function getDefaultOrganizationSettingsSnapshot(): OrganizationSettingsSnapshot {
  return {
    ...createDefaultOrganizationSettingsValue(),
    source: "default",
  };
}

export async function getOrganizationSettingsSnapshot(
  databaseUrl: string,
  authorization: AdminAuthorizationContext,
): Promise<OrganizationSettingsSnapshot> {
  if (authorization.role !== "owner") {
    throw new Error("Owner authorization is required to read settings.");
  }

  const database = createDatabase(databaseUrl);
  const results = await database.batch([
    database.execute(
      sql`select set_config('app.organization_id', ${authorization.organizationId}, true)`,
    ),
    database.execute(
      sql`select set_config('app.user_id', ${authorization.actor.id}, true)`,
    ),
    database.execute(
      sql`select set_config('app.membership_role', ${authorization.role}, true)`,
    ),
    database
      .select({
        consentRuleSets: organizationSettings.consentRuleSets,
        cookiePolicyVersions: organizationSettings.cookiePolicyVersions,
        featureFlags: organizationSettings.featureFlags,
        locales: organizationSettings.locales,
        regionProfiles: organizationSettings.regionProfiles,
      })
      .from(organizationSettings)
      .where(
        eq(organizationSettings.organizationId, authorization.organizationId),
      )
      .limit(1),
  ]);
  const storedSettings = results[3][0];

  if (!storedSettings) {
    throw new Error("Organization settings are unavailable.");
  }

  return {
    ...organizationSettingsValueSchema.parse(storedSettings),
    source: "neon",
  };
}
