"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

export function ResetPasswordForm({ isConfigured }: { isConfigured: boolean }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !isConfigured ||
      !token ||
      password !== confirmation ||
      password.length < 15
    ) {
      setErrorMessage(
        "This link is invalid, expired, or the passwords do not meet the 15-character minimum.",
      );
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const { error } = await adminAuthClient.resetPassword({
          newPassword: password,
          token,
        });

        if (error) {
          setErrorMessage(
            "The password could not be set. Request a new link and use a strong, uncompromised password.",
          );
          return;
        }

        setCompleted(true);
        setPassword("");
        setConfirmation("");
      } catch {
        setErrorMessage(
          "Password reset is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  if (completed) {
    return (
      <Authentication.AuthStack>
        <Authentication.AuthMessage tone="success">
          Your password is ready and existing sessions were revoked.
        </Authentication.AuthMessage>
        <Authentication.AuthLinks>
          <Navigation.Link href="/login?passwordUpdated=true">
            Sign in securely
          </Navigation.Link>
        </Authentication.AuthLinks>
      </Authentication.AuthStack>
    );
  }

  return (
    <Forms.Form onSubmit={submit}>
      {errorMessage ? (
        <Authentication.AuthMessage tone="error">
          {errorMessage}
        </Authentication.AuthMessage>
      ) : null}
      <Forms.PasswordField
        autoComplete="new-password"
        description="Use at least 15 characters and a unique password."
        disabled={isPending}
        label="New password"
        maxLength={128}
        minLength={15}
        onChange={(event) => setPassword(event.target.value)}
        required
        value={password}
      />
      <Forms.PasswordField
        autoComplete="new-password"
        disabled={isPending}
        label="Repeat new password"
        maxLength={128}
        minLength={15}
        onChange={(event) => setConfirmation(event.target.value)}
        required
        value={confirmation}
      />
      <Authentication.AuthActions>
        <Buttons.Button
          disabled={!isConfigured || !token}
          kind="brand"
          pending={isPending}
          pendingLabel="Updating password"
          size="large"
          type="submit"
        >
          Set password
        </Buttons.Button>
      </Authentication.AuthActions>
      <Authentication.AuthLinks>
        <Navigation.Link href="/forgot-password">
          Request a new link
        </Navigation.Link>
      </Authentication.AuthLinks>
    </Forms.Form>
  );
}
