import { connection } from "next/server";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import styles from "@/components/auth-shell.module.css";
import { createPortalFormToken } from "@/lib/form-security";
import { getSafePortalRedirectTarget } from "@/lib/redirect";

function firstQueryValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const query = await searchParams;
  const redirectTo = getSafePortalRedirectTarget(
    firstQueryValue(query.redirectTo),
  );
  const error = firstQueryValue(query.error);
  const message = query.verified
    ? "Your email is verified. Sign in with your new password."
    : query.passwordUpdated
      ? "Your password is ready. Sign in with Google or password."
      : query.loggedOut
        ? "You are securely signed out."
        : error
          ? error === "unavailable"
            ? "Customer sign-in is temporarily unavailable."
            : "Sign-in could not be completed. Check your details and try again."
          : null;

  return (
    <AuthShell eyebrow="Customer portal" title="Welcome back">
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        Google and password are two ways into the same Shapewebs account.
      </p>
      {message ? (
        <p className={styles["sw-portal-message-e2q9n4"]}>{message}</p>
      ) : null}
      <form
        action="/api/auth-flow/login"
        className={styles["sw-portal-form-c5n8p2"]}
        method="post"
      >
        <input
          name="csrfToken"
          type="hidden"
          value={createPortalFormToken("customer_login")}
        />
        <input name="redirectTo" type="hidden" value={redirectTo} />
        <label className={styles["sw-portal-field-f9q2m6"]}>
          <span>Email</span>
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label className={styles["sw-portal-field-f9q2m6"]}>
          <span>Password</span>
          <input
            autoComplete="current-password"
            maxLength={128}
            name="password"
            required
            type="password"
          />
        </label>
        <div className={styles["sw-portal-actions-b4v7k1"]}>
          <button
            className={styles["sw-portal-button-h3m8q5"]}
            name="method"
            type="submit"
            value="password"
          >
            Sign in with password
          </button>
          <button
            className={styles["sw-portal-button-alt-z8p1c6"]}
            formNoValidate
            name="method"
            type="submit"
            value="google"
          >
            Continue with Google
          </button>
        </div>
      </form>
      <Link className={styles["sw-portal-link-d7q4m2"]} href="/forgot-password">
        Forgot or want to add a password?
      </Link>
      <p className={styles["sw-portal-copy-j6m3v8"]}>
        New accounts are created from a private Shapewebs invitation.
      </p>
    </AuthShell>
  );
}
