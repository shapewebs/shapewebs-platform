"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Buttons, Forms } from "@shapewebs/ui";

import { getAdminStepUpUrl } from "@/lib/redirect";

import styles from "./account-security-methods.module.css";

type AccountPasskeySummary = {
  backedUp: boolean;
  createdAt: string | null;
  deviceType: string;
  id: string;
  name: string;
};

type MethodState = {
  google: boolean;
  passkeys: AccountPasskeySummary[];
  password: boolean;
};
type ProtectedActionResult = "complete" | "redirecting";
type PendingAction =
  "google" | "passkey-add" | `passkey-delete:${string}` | "password" | null;

const passwordLinkResumeTarget =
  "/account/security?resume=password-link" as const;
const passkeyEnrollmentResumeTarget =
  "/account/security?resume=passkey-add" as const;

function getPasskeyRemovalResumeTarget(id: string): string {
  const query = new URLSearchParams({
    passkeyId: id,
    resume: "passkey-delete",
  });
  return `/account/security?${query.toString()}`;
}

function supportsPasskeys(): boolean {
  return (
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined"
  );
}

function normalizePasskey(passkey: {
  backedUp: boolean;
  createdAt: Date;
  deviceType: string;
  id: string;
  name?: string;
}): AccountPasskeySummary {
  const createdAt: unknown = passkey.createdAt;

  return {
    backedUp: passkey.backedUp,
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === "string"
          ? createdAt
          : null,
    deviceType: passkey.deviceType,
    id: passkey.id,
    name: passkey.name?.trim() || "Passkey",
  };
}

function formatPasskeyDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function AccountSecurityMethods({
  customerAccess,
  email,
  initialMethods,
  resumePasskeyEnrollment = false,
  resumePasskeyRemovalId,
  resumePasswordLink = false,
  staffAccess,
}: {
  customerAccess: boolean;
  email: string;
  initialMethods: MethodState;
  resumePasskeyEnrollment?: boolean;
  resumePasskeyRemovalId?: string;
  resumePasswordLink?: boolean;
  staffAccess: boolean;
}) {
  const [methods, setMethods] = useState(initialMethods);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [passwordLinkQueued, setPasswordLinkQueued] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isPending, startTransition] = useTransition();
  const resumedPasskeyEnrollment = useRef(false);
  const resumedPasskeyRemoval = useRef(false);
  const resumedPasswordLink = useRef(false);

  const requireFreshStepUp = useCallback(
    (
      status: number,
      error: unknown,
      resumeTarget: string,
      reason: "password-link" | "step-up" = "step-up",
    ) => {
      if (status === 403 && error === "step_up_required") {
        window.location.assign(getAdminStepUpUrl(resumeTarget, reason));
        return true;
      }
      return false;
    },
    [],
  );

  const requestPasswordLink =
    useCallback(async (): Promise<ProtectedActionResult> => {
      setPendingAction("password");
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
        if (
          requireFreshStepUp(
            response.status,
            payload.error,
            passwordLinkResumeTarget,
            "password-link",
          )
        ) {
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
      } finally {
        setPendingAction(null);
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
    setPendingAction("google");
    startTransition(async () => {
      setMessage(null);

      try {
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
        if (
          requireFreshStepUp(
            response.status,
            payload.error,
            "/account/security",
          )
        ) {
          return;
        }
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
      } catch {
        setMessage("Google connection is temporarily unavailable.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  const registerPasskey =
    useCallback(async (): Promise<ProtectedActionResult> => {
      if (!supportsPasskeys()) {
        setMessage("Passkeys are not supported by this browser or device.");
        return "complete";
      }

      setPendingAction("passkey-add");
      setMessage(null);

      try {
        const { data, error } = await adminAuthClient.passkey.addPasskey();

        if (error) {
          const errorCode =
            "code" in error && typeof error.code === "string"
              ? error.code
              : null;
          if (
            requireFreshStepUp(
              error.status,
              error.message,
              passkeyEnrollmentResumeTarget,
            )
          ) {
            return "redirecting";
          }

          setMessage(
            errorCode === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
              ? "This passkey is already connected to your account."
              : errorCode === "REGISTRATION_CANCELLED" ||
                  errorCode === "ERROR_CEREMONY_ABORTED"
                ? "Passkey setup was cancelled."
                : "The passkey could not be added securely. Please try again.",
          );
          return "complete";
        }

        if (!data) {
          setMessage(
            "The passkey could not be added securely. Please try again.",
          );
          return "complete";
        }

        const passkey = normalizePasskey(data);
        setMethods((current) => ({
          ...current,
          passkeys: [
            passkey,
            ...current.passkeys.filter((item) => item.id !== passkey.id),
          ],
        }));
        setMessage("Passkey added. You can use it the next time you sign in.");
        return "complete";
      } catch {
        setMessage(
          "Passkey setup is temporarily unavailable. Please try again.",
        );
        return "complete";
      } finally {
        setPendingAction(null);
      }
    }, [requireFreshStepUp]);

  function addPasskey() {
    startTransition(async () => {
      await registerPasskey();
    });
  }

  const removePasskey = useCallback(
    async (id: string): Promise<ProtectedActionResult> => {
      if (
        methods.passkeys.length === 1 &&
        !methods.google &&
        !methods.password
      ) {
        setMessage(
          "Connect Google or a password before removing your only sign-in method.",
        );
        return "complete";
      }

      setPendingAction(`passkey-delete:${id}`);
      setMessage(null);

      try {
        const { data, error } = await adminAuthClient.passkey.deletePasskey({
          id,
        });

        if (error) {
          if (
            requireFreshStepUp(
              error.status,
              error.message,
              getPasskeyRemovalResumeTarget(id),
            )
          ) {
            return "redirecting";
          }

          setMessage("The passkey could not be removed securely.");
          return "complete";
        }

        if (!data?.status) {
          setMessage("The passkey could not be removed securely.");
          return "complete";
        }

        setMethods((current) => ({
          ...current,
          passkeys: current.passkeys.filter((passkey) => passkey.id !== id),
        }));
        setMessage("Passkey removed.");
        return "complete";
      } catch {
        setMessage(
          "Passkey removal is temporarily unavailable. Please try again.",
        );
        return "complete";
      } finally {
        setPendingAction(null);
      }
    },
    [
      methods.google,
      methods.passkeys.length,
      methods.password,
      requireFreshStepUp,
    ],
  );

  function deletePasskey(id: string) {
    startTransition(async () => {
      await removePasskey(id);
    });
  }

  useEffect(() => {
    if (!resumePasskeyEnrollment || resumedPasskeyEnrollment.current) return;

    resumedPasskeyEnrollment.current = true;
    startTransition(async () => {
      const result = await registerPasskey();
      if (result === "complete") {
        window.history.replaceState(
          window.history.state,
          "",
          "/account/security",
        );
      }
    });
  }, [registerPasskey, resumePasskeyEnrollment]);

  useEffect(() => {
    if (!resumePasskeyRemovalId || resumedPasskeyRemoval.current) return;

    resumedPasskeyRemoval.current = true;
    startTransition(async () => {
      const result = await removePasskey(resumePasskeyRemovalId);
      if (result === "complete") {
        window.history.replaceState(
          window.history.state,
          "",
          "/account/security",
        );
      }
    });
  }, [removePasskey, resumePasskeyRemovalId]);

  return (
    <section className={styles["accountsecurity-card-4m2k8p"]}>
      <p>
        Google, password, and passkeys belong to <strong>{email}</strong>. Each
        connected method opens this same Shapewebs account.
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
            <dd>Required after Google or password</dd>
          </div>
        ) : null}
        <div>
          <dt>Passkey</dt>
          <dd>
            {methods.passkeys.length === 0
              ? "Not connected"
              : `${methods.passkeys.length} connected`}
          </dd>
        </div>
      </dl>
      {methods.passkeys.length > 0 ? (
        <ul className={styles["accountsecurity-passkeys-b7m2qk"]}>
          {methods.passkeys.map((passkey) => (
            <li key={passkey.id}>
              <span>
                <strong>{passkey.name}</strong>
                <small>
                  {formatPasskeyDate(passkey.createdAt)} ·{" "}
                  {passkey.backedUp || passkey.deviceType === "multiDevice"
                    ? "Synced"
                    : "Device-bound"}
                </small>
              </span>
              <Buttons.Button
                disabled={isPending || pendingAction !== null}
                kind="tertiary"
                onClick={() => deletePasskey(passkey.id)}
                pending={pendingAction === `passkey-delete:${passkey.id}`}
                pendingLabel="Removing passkey"
                size="small"
                type="button"
              >
                Remove
              </Buttons.Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Buttons.Button
        disabled={isPending || pendingAction !== null}
        kind="secondary"
        onClick={addPasskey}
        pending={pendingAction === "passkey-add"}
        pendingLabel="Waiting for passkey..."
        size="medium"
        type="button"
      >
        {pendingAction === "passkey-add"
          ? "Waiting for passkey..."
          : methods.passkeys.length > 0
            ? "Add another passkey"
            : "Add a passkey"}
      </Buttons.Button>
      {!methods.password ? (
        <Buttons.Button
          aria-busy={isPending}
          disabled={isPending || pendingAction !== null || passwordLinkQueued}
          kind="primary"
          onClick={addPassword}
          size="medium"
          type="button"
        >
          {pendingAction === "password"
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
            disabled={isPending || pendingAction !== null}
            label="Confirm current password"
            maxLength={128}
            onChange={(event) => setPassword(event.target.value)}
            value={password}
          />
          <Buttons.Button
            disabled={isPending || pendingAction !== null || !password}
            kind="primary"
            onClick={connectGoogle}
            size="medium"
            type="button"
          >
            Connect matching Google account
          </Buttons.Button>
        </div>
      ) : null}
      {methods.google && methods.password && methods.passkeys.length > 0 ? (
        <p className={styles["accountsecurity-message-y7q1dc"]}>
          Google, password, and passkey sign-in all open this same account.
        </p>
      ) : null}
    </section>
  );
}
