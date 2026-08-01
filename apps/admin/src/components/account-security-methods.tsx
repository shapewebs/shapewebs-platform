"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Buttons, Forms } from "@shapewebs/ui";

import { getAdminStepUpUrl } from "@/lib/redirect";

import styles from "./account-security-methods.module.css";

type MethodState = { google: boolean; password: boolean };
type PasswordLinkResult = "complete" | "redirecting";

const passwordLinkResumeTarget =
  "/account/security?resume=password-link" as const;

export function AccountSecurityMethods({
  customerAccess,
  email,
  initialMethods,
  resumePasswordLink = false,
  staffAccess,
}: {
  customerAccess: boolean;
  email: string;
  initialMethods: MethodState;
  resumePasswordLink?: boolean;
  staffAccess: boolean;
}) {
  const [methods, setMethods] = useState(initialMethods);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [passwordLinkQueued, setPasswordLinkQueued] = useState(false);
  const [isPending, startTransition] = useTransition();
  const resumedPasswordLink = useRef(false);

  const requireFreshStepUp = useCallback((status: number, error: unknown) => {
    if (status === 403 && error === "step_up_required") {
      window.location.assign(
        getAdminStepUpUrl(passwordLinkResumeTarget, "password-link"),
      );
      return true;
    }
    return false;
  }, []);

  const requestPasswordLink =
    useCallback(async (): Promise<PasswordLinkResult> => {
      setMessage("Requesting a secure password link…");

      try {
        const response = await fetch("/api/account/methods/add-password", {
          body: "{}",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: unknown;
          status?: unknown;
        };
        if (requireFreshStepUp(response.status, payload.error)) {
          return "redirecting";
        }
        if (!response.ok) {
          setMessage("The password link could not be requested securely.");
          return "complete";
        }
        if (payload.status === "password_exists") {
          setMethods((current) => ({ ...current, password: true }));
          setMessage("A password is already connected.");
          return "complete";
        }
        if (payload.status === "password_email_pending") {
          setPasswordLinkQueued(true);
          setMessage(
            "A secure link is already queued. Delivery can take up to five minutes.",
          );
          return "complete";
        }
        if (payload.status === "password_email_queued") {
          setPasswordLinkQueued(true);
          setMessage(
            "Secure link queued. Check your verified mailbox within five minutes.",
          );
          return "complete";
        }
        setMessage("The password link could not be requested securely.");
      } catch {
        setMessage(
          "The password-link request did not reach Shapewebs. Check your connection and try again.",
        );
      }

      return "complete";
    }, [requireFreshStepUp]);

  function addPassword() {
    startTransition(async () => {
      await requestPasswordLink();
    });
  }

  useEffect(() => {
    if (
      !resumePasswordLink ||
      resumedPasswordLink.current ||
      methods.password
    ) {
      return;
    }

    resumedPasswordLink.current = true;
    startTransition(async () => {
      const result = await requestPasswordLink();
      if (result === "complete") {
        window.history.replaceState(
          window.history.state,
          "",
          "/account/security",
        );
      }
    });
  }, [methods.password, requestPasswordLink, resumePasswordLink]);

  function connectGoogle() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/account/methods/connect-google", {
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
    <section className={styles["accountsecurity-card-4m2k8p"]}>
      <p>
        Both methods belong to <strong>{email}</strong>. Once connected, either
        method opens this same Shapewebs account.
      </p>
      <p>
        Access:{" "}
        <strong>
          {staffAccess && customerAccess
            ? "Customer and studio"
            : staffAccess
              ? "Studio"
              : "Customer"}
        </strong>
      </p>
      {message ? (
        <p
          aria-live="polite"
          className={styles["accountsecurity-message-y7q1dc"]}
          role="status"
        >
          {message}
        </p>
      ) : null}
      <dl className={styles["accountsecurity-methods-k9w5nf"]}>
        <div>
          <dt>Google</dt>
          <dd>{methods.google ? "Connected" : "Not connected"}</dd>
        </div>
        <div>
          <dt>Password</dt>
          <dd>{methods.password ? "Connected" : "Not connected"}</dd>
        </div>
        {staffAccess ? (
          <div>
            <dt>Authenticator code</dt>
            <dd>Required for studio access</dd>
          </div>
        ) : null}
        <div>
          <dt>Passkey</dt>
          <dd>Planned</dd>
        </div>
      </dl>
      {!methods.password ? (
        <Buttons.Button
          aria-busy={isPending}
          disabled={isPending || passwordLinkQueued}
          kind="primary"
          onClick={addPassword}
          size="medium"
          type="button"
        >
          {isPending
            ? "Queuing secure link…"
            : passwordLinkQueued
              ? "Secure link queued"
              : "Email me a secure password link"}
        </Buttons.Button>
      ) : null}
      {!methods.google && methods.password ? (
        <div className={styles["accountsecurity-connect-t3j8vx"]}>
          <Forms.PasswordField
            autoComplete="current-password"
            disabled={isPending}
            label="Confirm current password"
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
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
        <p className={styles["accountsecurity-message-y7q1dc"]}>
          Complete: you can use Google or password at each login.
        </p>
      ) : null}
    </section>
  );
}
