"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Buttons } from "@shapewebs/ui";

import { getSafeAdminRedirectTarget } from "@/lib/redirect";

import styles from "./page.module.css";

type LoginFormProps = {
  isConfigured: boolean;
};

function getRouteErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "access_denied":
    case "unauthorized":
      return "This Google account is not authorized for Shapewebs Admin.";
    case "setup":
      return "Authentication still needs to be configured for this environment.";
    default:
      return null;
  }
}

export function LoginForm({ isConfigured }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeAdminRedirectTarget(
    searchParams.get("redirectTo") ?? "/dashboard",
  );
  const routeErrorMessage = getRouteErrorMessage(searchParams.get("error"));
  const statusMessage = searchParams.has("verified")
    ? "Your email is verified. Sign in with your password."
    : searchParams.has("passwordUpdated")
      ? "Your password is ready. You can now use Google or password."
      : null;
  const mfaPath = `/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`;

  function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setErrorMessage("Authentication is not configured in this environment.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      const { data, error } = await adminAuthClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: false,
      });

      if (error || !data) {
        setErrorMessage(
          "Sign-in could not be completed. Check your details and try again.",
        );
        return;
      }

      const pendingChallenge =
        "twoFactorRedirect" in data && data.twoFactorRedirect === true;
      window.location.assign(
        pendingChallenge ? `${mfaPath}&pending=password` : mfaPath,
      );
    });
  }

  return (
    <div className={styles.formB8q1n7}>
      {statusMessage ? (
        <p className={styles.noticeStateV7m3k2}>{statusMessage}</p>
      ) : errorMessage ? (
        <p className={styles.errorStateC6d2r9} role="alert">
          {errorMessage}
        </p>
      ) : routeErrorMessage ? (
        <p className={styles.errorStateC6d2r9} role="alert">
          {routeErrorMessage}
        </p>
      ) : null}

      <form
        className={styles["sw-auth-form-h8q2v5"]}
        onSubmit={signInWithPassword}
      >
        <label className={styles.fieldM4k7v3}>
          <span>Email</span>
          <input
            autoComplete="email"
            disabled={isPending}
            maxLength={320}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className={styles.fieldM4k7v3}>
          <span>Password</span>
          <input
            autoComplete="current-password"
            disabled={isPending}
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <Buttons.Button
          disabled={!isConfigured || isPending}
          kind="primary"
          size="medium"
          type="submit"
        >
          {isPending ? "Signing in..." : "Sign in with password"}
        </Buttons.Button>
      </form>

      <div className={styles["sw-auth-divider-n4c8p2"]}>
        <span>or</span>
      </div>

      <Buttons.Button
        disabled={!isConfigured || isPending}
        kind="primary"
        onClick={() => {
          if (!isConfigured) {
            setErrorMessage(
              "Authentication is not configured in this environment.",
            );
            return;
          }

          startTransition(async () => {
            setErrorMessage(null);

            const { error } = await adminAuthClient.signIn.social({
              callbackURL: mfaPath,
              errorCallbackURL: `/login?error=access_denied&redirectTo=${encodeURIComponent(redirectTo)}`,
              provider: "google",
            });

            if (error) {
              setErrorMessage(
                "Google sign-in could not be started. Please try again.",
              );
            }
          });
        }}
        size="medium"
        type="button"
      >
        {isPending ? "Opening Google..." : "Continue with Google"}
      </Buttons.Button>

      <p className={styles.noticeStateV7m3k2}>
        Both methods open the same employee account. Every admin login still
        requires your authenticator code.
      </p>
      <div className={styles["sw-auth-links-r6m2k9"]}>
        <Link href="/forgot-password">Forgot or want to add a password?</Link>
        <Link href="/activate">Activate an allowlisted employee account</Link>
      </div>
    </div>
  );
}
