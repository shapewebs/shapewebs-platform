"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Buttons, Navigation } from "@shapewebs/ui";

import styles from "../login/page.module.css";

export function ForgotPasswordForm({
  isConfigured,
}: {
  isConfigured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [email, setEmail] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) return;

    startTransition(async () => {
      const response = await fetch("/api/admin/account/request-password", {
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) setCompleted(true);
    });
  }

  return (
    <form className={styles["sw-auth-stack-m6y2b4"]} onSubmit={submit}>
      {completed ? (
        <p className={styles["sw-auth-notice-p5a1d7"]}>
          If this is an eligible employee account, a single-use link will arrive
          shortly. The response is intentionally identical for unknown
          addresses.
        </p>
      ) : (
        <>
          <label className={styles["sw-auth-field-r7c3f9"]}>
            <span>Work email</span>
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
          <Buttons.Button
            disabled={!isConfigured || isPending}
            kind="primary"
            size="medium"
            type="submit"
          >
            {isPending ? "Requesting..." : "Email secure password link"}
          </Buttons.Button>
        </>
      )}
      <Navigation.Link href="/login">Return to sign in</Navigation.Link>
    </form>
  );
}
