"use client";

import { useState, useTransition } from "react";
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeAdminRedirectTarget(
    searchParams.get("redirectTo") ?? "/dashboard",
  );
  const routeErrorMessage = getRouteErrorMessage(searchParams.get("error"));

  return (
    <div className={styles.formB8q1n7}>
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
              callbackURL: redirectTo,
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
        Public signup and password login are disabled. Only explicitly
        allowlisted owner accounts can create an admin session.
      </p>
    </div>
  );
}
