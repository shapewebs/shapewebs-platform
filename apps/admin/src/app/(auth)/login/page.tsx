import { Suspense } from "react";
import { hasAdminSupabaseConfig } from "@/lib/supabase";
import { LoginForm } from "./login-form";
import styles from "./page.module.css";

export default function LoginPage() {
  const isConfigured = hasAdminSupabaseConfig();

  return (
    <main className={styles.rootD4n8k1}>
      <section className={styles.panelQ7m2v5}>
        <p className={styles.eyebrowZ3p9t2}>Shapewebs Admin</p>
        <h1 className={styles.titleR6k2m4}>CMS access</h1>
        <p className={styles.copyH2v8q6}>
          Sign in with your admin account, then complete MFA before entering the
          CMS. In local setup mode, content screens remain visible for schema and
          UI work until Supabase is connected.
        </p>

        {!isConfigured ? (
          <p className={styles.noticeStateV7m3k2}>
            Supabase auth is not configured yet, so the admin app will run in a
            local setup mode until `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` are available.
          </p>
        ) : null}

        <Suspense fallback={null}>
          <LoginForm isConfigured={isConfigured} />
        </Suspense>
      </section>
    </main>
  );
}
