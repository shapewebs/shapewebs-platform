"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

import { AccountTurnstileField } from "@/components/account-turnstile-field";

export function ForgotPasswordForm({
  isConfigured,
  nonce,
  siteKey,
}: {
  isConfigured: boolean;
  nonce: string;
  siteKey: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(false);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const turnstileToken = new FormData(event.currentTarget).get(
      "turnstileToken",
    );

    if (!isConfigured) {
      setErrorMessage("Password recovery is unavailable in this environment.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch("/api/account/request-password", {
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            turnstileToken:
              typeof turnstileToken === "string" ? turnstileToken : "",
          }),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          setErrorMessage(
            "The secure password request could not be submitted. Please try again.",
          );
          return;
        }

        setCompleted(true);
      } catch {
        setErrorMessage(
          "Password recovery is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  return (
    <Forms.Form onSubmit={submit}>
      {errorMessage ? (
        <Authentication.AuthMessage tone="error">
          {errorMessage}
        </Authentication.AuthMessage>
      ) : null}
      {completed ? (
        <Authentication.AuthMessage>
          If this is an eligible Shapewebs account, a single-use link will
          arrive shortly. The response is intentionally identical for unknown
          addresses.
        </Authentication.AuthMessage>
      ) : (
        <>
          <Forms.Field>
            <Forms.Label htmlFor="account-recovery-email">Email</Forms.Label>
            <Forms.Input
              autoComplete="email"
              controlSize="large"
              disabled={isPending}
              id="account-recovery-email"
              maxLength={320}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Forms.Field>
          <AccountTurnstileField
            action="customer_recovery"
            nonce={nonce}
            siteKey={siteKey}
          />
          <Authentication.AuthActions>
            <Buttons.Button
              disabled={!isConfigured}
              kind="brand"
              pending={isPending}
              pendingLabel="Requesting password link"
              size="large"
              type="submit"
            >
              Email secure password link
            </Buttons.Button>
          </Authentication.AuthActions>
        </>
      )}
      <Authentication.AuthLinks>
        <Navigation.Link href="/login">Return to sign in</Navigation.Link>
      </Authentication.AuthLinks>
    </Forms.Form>
  );
}
