"use client";

import { useState, useTransition } from "react";
import { Buttons } from "@shapewebs/ui";

import styles from "./page.module.css";

type MethodState = { google: boolean; password: boolean };

export function SecurityMethods({
  email,
  initialMethods,
}: {
  email: string;
  initialMethods: MethodState;
}) {
  const [methods, setMethods] = useState(initialMethods);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requireFreshStepUp(status: number, error: unknown) {
    if (status === 403 && error === "step_up_required") {
      window.location.assign(
        "/login/mfa?reason=step-up&redirectTo=%2Faccount%2Fsecurity",
      );
      return true;
    }
    return false;
  }

  function addPassword() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/methods/add-password", {
        body: "{}",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        status?: unknown;
      };
      if (requireFreshStepUp(response.status, payload.error)) return;
      if (!response.ok) {
        setMessage("The password link could not be requested securely.");
        return;
      }
      if (payload.status === "password_exists") {
        setMethods((current) => ({ ...current, password: true }));
        setMessage("A password is already connected.");
        return;
      }
      setMessage("Check your verified email for a single-use password link.");
    });
  }

  function connectGoogle() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/admin/methods/connect-google", {
        body: JSON.stringify({ password }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: unknown;
        status?: unknown;
        url?: unknown;
      };
      if (requireFreshStepUp(response.status, payload.error)) return;
      if (
        response.ok &&
        payload.status === "google_authorization" &&
        typeof payload.url === "string"
      ) {
        window.location.assign(payload.url);
        return;
      }
      if (response.ok && payload.status === "google_exists") {
        setMethods((current) => ({ ...current, google: true }));
        setMessage("Google is already connected.");
        return;
      }
      setMessage(
        payload.error === "reauthentication_failed"
          ? "The current password was not accepted."
          : "Google could not be connected securely.",
      );
    });
  }

  return (
    <section className={styles["sw-security-card-t7q2m8"]}>
      <h2>Sign-in methods</h2>
      <p>
        Both methods belong to <strong>{email}</strong>. Either method opens
        this same employee account; TOTP remains mandatory afterward.
      </p>
      {message ? (
        <p className={styles["sw-security-message-p3n8v2"]} role="status">
          {message}
        </p>
      ) : null}
      <dl className={styles["sw-security-methods-r4m7k2"]}>
        <div>
          <dt>Google</dt>
          <dd>{methods.google ? "Connected" : "Not connected"}</dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>{methods.password ? "Connected" : "Not connected"}</dd>
        </div>
        <div>
          <dt>Authenticator code</dt>
          <dd>Required</dd>
        </div>
      </dl>
      {!methods.password ? (
        <Buttons.Button
          disabled={isPending}
          kind="primary"
          onClick={addPassword}
          size="medium"
          type="button"
        >
          Email me a secure password link
        </Buttons.Button>
      ) : null}
      {!methods.google && methods.password ? (
        <div className={styles["sw-security-connect-f8q2n5"]}>
          <label>
            <span>Confirm current password</span>
            <input
              autoComplete="current-password"
              disabled={isPending}
              maxLength={128}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <Buttons.Button
            disabled={isPending || !password}
            kind="primary"
            onClick={connectGoogle}
            size="medium"
            type="button"
          >
            Connect matching Google account
          </Buttons.Button>
        </div>
      ) : null}
      {methods.google && methods.password ? (
        <p className={styles["sw-security-message-p3n8v2"]}>
          Complete: you can use Google or password at each login.
        </p>
      ) : null}
    </section>
  );
}
