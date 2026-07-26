"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { Buttons } from "@shapewebs/ui";

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
    <form className={styles.formB8q1n7} onSubmit={submit}>
      {completed ? (
        <p className={styles.noticeStateV7m3k2}>
          If this is an eligible employee account, a single-use link will arrive
          shortly. The response is intentionally identical for unknown
          addresses.
        </p>
      ) : (
        <>
          <label className={styles.fieldM4k7v3}>
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
      <Link href="/login">Return to sign in</Link>
    </form>
  );
}
