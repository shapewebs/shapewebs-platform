"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Buttons, Navigation } from "@shapewebs/ui";

import styles from "../login/page.module.css";

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
    });
  }

  if (completed) {
    return (
      <div className={styles["sw-auth-stack-m6y2b4"]}>
        <p className={styles["sw-auth-notice-p5a1d7"]}>
          Your password is ready and existing sessions were revoked.
        </p>
        <Navigation.Link href="/login?passwordUpdated=true">
          Sign in securely
        </Navigation.Link>
      </div>
    );
  }

  return (
    <form className={styles["sw-auth-stack-m6y2b4"]} onSubmit={submit}>
      {errorMessage ? (
        <p className={styles["sw-auth-error-q6b2e8"]} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <label className={styles["sw-auth-field-r7c3f9"]}>
        <span>New password</span>
        <input
          autoComplete="new-password"
          disabled={isPending}
          maxLength={128}
          minLength={15}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <label className={styles["sw-auth-field-r7c3f9"]}>
        <span>Repeat new password</span>
        <input
          autoComplete="new-password"
          disabled={isPending}
          maxLength={128}
          minLength={15}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </label>
      <Buttons.Button
        disabled={!isConfigured || isPending || !token}
        kind="primary"
        size="medium"
        type="submit"
      >
        {isPending ? "Updating..." : "Set password"}
      </Buttons.Button>
      <Navigation.Link href="/forgot-password">
        Request a new link
      </Navigation.Link>
    </form>
  );
}
