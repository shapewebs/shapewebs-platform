"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

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

      try {
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
      } catch {
        setErrorMessage(
          "Activation is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  if (completed) {
    return (
      <Authentication.AuthStack>
        <Authentication.AuthMessage>
          If this address is allowlisted and can be activated, a single-use
          verification link will arrive shortly.
        </Authentication.AuthMessage>
        <Authentication.AuthLinks>
          <Navigation.Link href="/login">Return to sign in</Navigation.Link>
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
      <Forms.Field>
        <Forms.Label htmlFor="employee-name">Full name</Forms.Label>
        <Forms.Input
          autoComplete="name"
          controlSize="large"
          disabled={isPending}
          id="employee-name"
          maxLength={120}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </Forms.Field>
      <Forms.Field>
        <Forms.Label htmlFor="employee-activation-email">
          Allowlisted work email
        </Forms.Label>
        <Forms.Input
          autoComplete="email"
          controlSize="large"
          disabled={isPending}
          id="employee-activation-email"
          maxLength={320}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </Forms.Field>
      <Forms.PasswordField
        autoComplete="new-password"
        description="Use at least 15 characters and a unique password."
        disabled={isPending}
        label="Password"
        maxLength={128}
        minLength={15}
        onChange={(event) => setPassword(event.target.value)}
        required
        value={password}
      />
      <Forms.PasswordField
        autoComplete="new-password"
        disabled={isPending}
        label="Repeat password"
        maxLength={128}
        minLength={15}
        onChange={(event) => setConfirmation(event.target.value)}
        required
        value={confirmation}
      />
      <Authentication.AuthActions>
        <Buttons.Button
          disabled={!isConfigured}
          kind="brand"
          pending={isPending}
          pendingLabel="Submitting activation"
          size="large"
          type="submit"
        >
          Create password account
        </Buttons.Button>
      </Authentication.AuthActions>
      <Authentication.AuthMessage>
        Already used Google? Sign in with Google and add a password from Account
        security instead.
      </Authentication.AuthMessage>
      <Authentication.AuthLinks>
        <Navigation.Link href="/login">Return to sign in</Navigation.Link>
      </Authentication.AuthLinks>
    </Forms.Form>
  );
}
