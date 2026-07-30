import {
  getDefaultOrganizationSettingsSnapshot,
  getOrganizationSettingsSnapshot,
  listOrganizationAdminSessions,
} from "@shapewebs/database/server";
import { Layout } from "@shapewebs/ui";

import { AdminPage } from "@/components/admin-page";
import { requireAdminSession } from "@/lib/auth";
import { getAdminDatabaseUrl } from "@/lib/better-auth";
import styles from "./page.module.css";
import { SessionManager, type AdminSessionListItem } from "./session-manager";

export default async function SettingsPage() {
  const runtime = await requireAdminSession({
    redirectTo: "/settings",
    roles: ["owner"],
  });
  const databaseUrl = getAdminDatabaseUrl();

  if (!runtime.setupMode && (!databaseUrl || !runtime.authorization)) {
    throw new Error("Organization settings are unavailable.");
  }

  const [settings, sessions] =
    runtime.setupMode || !databaseUrl || !runtime.authorization
      ? [getDefaultOrganizationSettingsSnapshot(), []]
      : await Promise.all([
          getOrganizationSettingsSnapshot(databaseUrl, runtime.authorization),
          listOrganizationAdminSessions(databaseUrl, runtime.authorization),
        ]);
  const sessionItems: AdminSessionListItem[] = sessions.map((session) => ({
    ...session,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    stepUpVerifiedAt: session.stepUpVerifiedAt?.toISOString() ?? null,
  }));

  return (
    <AdminPage
      description={
        <p>
          Locales, region profiles, consent rule sets, cookie policy versions,
          and feature flags are read from the owner-scoped Neon settings
          repository.
        </p>
      }
      eyebrow="System"
      title="Platform settings"
    >
      <div className={styles["sw-settings-grid-a6m2q8"]}>
        <Layout.Card className={styles["sw-settings-card-b7n3r9"]}>
          <h2>Locales</h2>
          {settings.locales.map((locale) => (
            <p key={locale.code}>
              {locale.label} ({locale.code}) {locale.isDefault ? "Default" : ""}
            </p>
          ))}
        </Layout.Card>

        <Layout.Card className={styles["sw-settings-card-b7n3r9"]}>
          <h2>Region profiles</h2>
          {settings.regionProfiles.map((profile) => (
            <p key={profile.code}>
              {profile.displayName} → {profile.ruleSetKey}
            </p>
          ))}
        </Layout.Card>

        <Layout.Card className={styles["sw-settings-card-b7n3r9"]}>
          <h2>Consent rule sets</h2>
          {settings.consentRuleSets.map((ruleSet) => (
            <p key={ruleSet.key}>
              {ruleSet.key} ({ruleSet.defaultMode})
            </p>
          ))}
        </Layout.Card>

        <Layout.Card className={styles["sw-settings-card-b7n3r9"]}>
          <h2>Feature flags</h2>
          {settings.featureFlags.map((flag) => (
            <p key={flag.key}>
              {flag.key}: {flag.enabled ? "Enabled" : "Disabled"}
            </p>
          ))}
        </Layout.Card>
      </div>

      {!runtime.setupMode ? <SessionManager sessions={sessionItems} /> : null}
    </AdminPage>
  );
}
