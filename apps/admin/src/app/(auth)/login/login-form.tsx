"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Buttons } from "@shapewebs/ui";
import { createBrowserSupabaseClient } from "@shapewebs/db/browser";
import { getSafeAdminRedirectTarget } from "@/lib/redirect";
import styles from "./page.module.css";

type LoginFormProps = {
  isConfigured: boolean;
};

function getRouteErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "unauthorized":
      return "Your account is not authorized for the Shapewebs admin portal.";
    case "setup":
      return "Authentication still needs to be configured for this environment.";
    default:
      return null;
  }
}

export function LoginForm({ isConfigured }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeAdminRedirectTarget(
    searchParams.get("redirectTo") ?? "/dashboard",
  );
  const routeErrorMessage = getRouteErrorMessage(searchParams.get("error"));

  return (
    <form
      className={styles.formB8q1n7}
      onSubmit={(event) => {
        event.preventDefault();

        if (!isConfigured) {
          setErrorMessage(
            "Authentication is not configured in this environment.",
          );
          return;
        }

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        const supabase = createBrowserSupabaseClient();

        if (!supabase) {
          setErrorMessage(
            "Authentication is not configured in this environment.",
          );
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

          const { data: assurance } =
            await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

          if (
            assurance?.currentLevel !== "aal2" &&
            assurance?.nextLevel === "aal2"
          ) {
            router.replace(
              `/login/mfa?redirectTo=${encodeURIComponent(getSafeAdminRedirectTarget(redirectTo))}`,
            );
            router.refresh();
            return;
          }

          router.replace(getSafeAdminRedirectTarget(redirectTo));
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
      ) : routeErrorMessage ? (
        <p className={styles.errorStateC6d2r9} role="alert">
          {routeErrorMessage}
        </p>
      ) : null}

      <Buttons.Button
        disabled={!isConfigured || isPending}
        kind="primary"
        size="medium"
        type="submit"
      >
        {isPending ? "Signing in..." : "Continue"}
      </Buttons.Button>
    </form>
  );
}
