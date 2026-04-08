"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Buttons } from "@shapewebs/ui";
import { createBrowserSupabaseClient } from "@shapewebs/db";
import styles from "./page.module.css";

type LoginFormProps = {
  isConfigured: boolean;
};

function getSafeRedirectTarget(redirectTo: string) {
  return redirectTo.startsWith("/") ? redirectTo : "/dashboard";
}

const errorMessages: Record<string, string> = {
  unauthorized: "Your account is not authorized for the Shapewebs admin portal.",
  setup: "Supabase auth still needs to be configured for this environment.",
};

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeRedirectTarget(searchParams.get("redirectTo") ?? "/dashboard");
  const routeError = searchParams.get("error");

  return (
    <form
      className={styles.formB8q1n7}
      onSubmit={(event) => {
        event.preventDefault();

        if (!isConfigured) {
          setErrorMessage("Supabase auth is not configured in this environment yet.");
          return;
        }

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        const supabase = createBrowserSupabaseClient();

        if (!supabase) {
          setErrorMessage("Supabase auth is not configured in this environment yet.");
          return;
        }

        startTransition(async () => {
          setErrorMessage(null);

          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            setErrorMessage(error.message);
            return;
          }

          const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          if (
            assurance?.currentLevel !== "aal2" &&
            assurance?.nextLevel === "aal2"
          ) {
            router.replace(
              `/login/mfa?redirectTo=${encodeURIComponent(getSafeRedirectTarget(redirectTo))}`,
            );
            router.refresh();
            return;
          }

          router.replace(getSafeRedirectTarget(redirectTo));
          router.refresh();
        });
      }}
    >
      <label className={styles.fieldM4k7v3}>
        <span>Email</span>
        <input
          autoComplete="email"
          disabled={!isConfigured || isPending}
          name="email"
          placeholder="owner@shapewebs.com"
          required
          type="email"
        />
      </label>

      <label className={styles.fieldM4k7v3}>
        <span>Password</span>
        <input
          autoComplete="current-password"
          disabled={!isConfigured || isPending}
          name="password"
          placeholder="••••••••••••"
          required
          type="password"
        />
      </label>

      {errorMessage ? (
        <p className={styles.errorStateC6d2r9} role="alert">
          {errorMessage}
        </p>
      ) : routeError && errorMessages[routeError] ? (
        <p className={styles.errorStateC6d2r9} role="alert">
          {errorMessages[routeError]}
        </p>
      ) : null}

      <Buttons.Button disabled={!isConfigured || isPending} kind="primary" size="medium" type="submit">
        {isPending ? "Signing in..." : "Continue"}
      </Buttons.Button>
    </form>
  );
}
