"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Buttons } from "@shapewebs/ui";

import { getAdminStepUpUrl } from "@/lib/redirect";

import styles from "./page.module.css";

type MethodState = { google: boolean; password: boolean };
type PasswordLinkResult = "complete" | "redirecting";

const passwordLinkResumeTarget =
  "/account/security?resume=password-link" as const;

export function SecurityMethods({
  email,
  initialMethods,
  resumePasswordLink = false,
}: {
  email: string;
  initialMethods: MethodState;
  resumePasswordLink?: boolean;
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
            "A secure link is already queued. Delivery can take up to five minutes. Search your verified mailbox for “Set your Shapewebs Admin password”.",
          );
          return "complete";
        }
        if (payload.status === "password_email_queued") {
          setPasswordLinkQueued(true);
          setMessage(
            "Secure link queued. Delivery can take up to five minutes. Search your verified mailbox for “Set your Shapewebs Admin password”.",
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
        <p
          aria-live="polite"
          className={styles["sw-security-message-p3n8v2"]}
          role="status"
        >
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
