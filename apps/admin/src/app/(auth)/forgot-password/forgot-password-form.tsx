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
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");

  function resetTurnstile() {
    setTurnstileToken("");
    setTurnstileAttempt((attempt) => attempt + 1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setErrorMessage("Password recovery is unavailable in this environment.");
      return;
    }

    if (!turnstileToken) {
      setErrorMessage("Complete the security check and try again.");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch("/api/account/request-password", {
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            turnstileToken,
          }),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          resetTurnstile();
          setErrorMessage(
            "The secure password request could not be submitted. Please try again.",
          );
          return;
        }

        setCompleted(true);
      } catch {
        resetTurnstile();
        setErrorMessage(
          "Password recovery is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  return (
    <>
      <Authentication.AuthStageHeader title="Set or recover a password" />
      <Authentication.AuthStack>
        <Forms.Form onSubmit={submit}>
          {completed ? (
            <Authentication.AuthMessage>
              Check your inbox. If an account matches that email, a secure
              password link is on its way.
            </Authentication.AuthMessage>
          ) : (
            <>
              <Forms.Field>
                <Forms.Label htmlFor="account-recovery-email">
                  Email
                </Forms.Label>
                <Forms.Input
                  autoComplete="email"
                  controlSize="large"
                  disabled={isPending}
                  id="account-recovery-email"
                  maxLength={320}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address..."
                  required
                  type="email"
                  value={email}
                />
              </Forms.Field>
              <AccountTurnstileField
                action="customer_recovery"
                key={turnstileAttempt}
                nonce={nonce}
                onTokenChange={setTurnstileToken}
                showStatus={false}
                siteKey={siteKey}
              />
              <Authentication.AuthActions>
                <Buttons.Button
                  disabled={!isConfigured || !turnstileToken}
                  kind="brand"
                  pending={isPending}
                  pendingLabel="Requesting password link"
                  size="large"
                  type="submit"
                >
                  Email secure password link
                </Buttons.Button>
              </Authentication.AuthActions>
              {errorMessage ? (
                <Authentication.AuthMessage tone="error">
                  {errorMessage}
                </Authentication.AuthMessage>
              ) : null}
            </>
          )}
        </Forms.Form>
        <Authentication.AuthLinks>
          <Navigation.Link href="/login">Return to sign in</Navigation.Link>
        </Authentication.AuthLinks>
      </Authentication.AuthStack>
    </>
  );
}
