import { getSettingsSnapshot } from "@shapewebs/db";
import { getAdminRuntimeState } from "@/lib/auth";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const runtime = await getAdminRuntimeState();
  const settings = await getSettingsSnapshot(runtime.supabase);

  return (
    <main className={styles.rootQ3m8p1}>
      <header className={styles.headerN9m2q4}>
        <p className={styles.eyebrowM4q7p2}>Settings</p>
        <h1>Platform settings snapshot</h1>
        <p>
          Locales, region profiles, consent rule sets, cookie policy versions,
          and feature flags are now coming through the shared settings
          repository.
        </p>
      </header>

      <div className={styles.gridV7m3q1}>
        <section className={styles.cardH2m8q5}>
          <h2>Locales</h2>
          {settings.locales.map((locale) => (
            <p key={locale.code}>
              {locale.label} ({locale.code}) {locale.isDefault ? "Default" : ""}
            </p>
          ))}
        </section>

        <section className={styles.cardH2m8q5}>
          <h2>Region profiles</h2>
          {settings.regionProfiles.map((profile) => (
            <p key={profile.code}>
              {profile.displayName} → {profile.ruleSetKey}
            </p>
          ))}
        </section>

        <section className={styles.cardH2m8q5}>
          <h2>Consent rule sets</h2>
          {settings.consentRuleSets.map((ruleSet) => (
            <p key={ruleSet.key}>
              {ruleSet.key} ({ruleSet.defaultMode})
            </p>
          ))}
        </section>

        <section className={styles.cardH2m8q5}>
          <h2>Feature flags</h2>
          {settings.featureFlags.map((flag) => (
            <p key={flag.key}>
              {flag.key}: {flag.enabled ? "Enabled" : "Disabled"}
            </p>
          ))}
        </section>
      </div>
    </main>
  );
}
