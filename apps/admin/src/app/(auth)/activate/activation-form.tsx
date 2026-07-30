"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Buttons, Navigation } from "@shapewebs/ui";

import styles from "../login/page.module.css";

export function ActivationForm({ isConfigured }: { isConfigured: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured || password !== confirmation || password.length < 15) {
      setErrorMessage(
        !isConfigured
          ? "Authentication is unavailable in this environment."
          : "Use a matching password of at least 15 characters.",
      );
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      const response = await fetch("/api/admin/account/activate", {
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          password,
        }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setErrorMessage(
          "The secure activation request could not be submitted.",
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
          If this address is allowlisted and can be activated, a single-use
          verification link will arrive shortly.
        </p>
        <Navigation.Link href="/login">Return to sign in</Navigation.Link>
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
        <span>Full name</span>
        <input
          autoComplete="name"
          disabled={isPending}
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      <label className={styles["sw-auth-field-r7c3f9"]}>
        <span>Allowlisted work email</span>
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
      <label className={styles["sw-auth-field-r7c3f9"]}>
        <span>Password</span>
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
        <span>Repeat password</span>
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
        disabled={!isConfigured || isPending}
        kind="primary"
        size="medium"
        type="submit"
      >
        {isPending ? "Submitting..." : "Create password account"}
      </Buttons.Button>
      <p className={styles["sw-auth-notice-p5a1d7"]}>
        Already used Google? Sign in with Google and add a password from Account
        security instead.
      </p>
      <Navigation.Link href="/login">Return to sign in</Navigation.Link>
    </form>
  );
}
