"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Buttons } from "@shapewebs/ui";

import styles from "./session-manager.module.css";

export type AdminSessionListItem = {
  createdAt: string;
  expiresAt: string;
  id: string;
  isActive: boolean;
  isCurrent: boolean;
  lastSeenAt: string;
  stepUpVerifiedAt: string | null;
  userAgent: string;
  userEmail: string;
  userName: string;
};

type SessionManagerProps = {
  sessions: AdminSessionListItem[];
};

function formatUtc(value: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

export function SessionManager({ sessions }: SessionManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <section className={styles["sw-session-root-q8m2v4"]}>
      <div className={styles["sw-session-header-n3k7p1"]}>
        <div>
          <p className={styles["sw-session-eyebrow-t6m1q9"]}>Security</p>
          <h2>Administrative sessions</h2>
        </div>
        <p>
          Review every unexpired Shapewebs Admin session in this organization.
          Revocation invalidates the selected browser credential immediately.
        </p>
      </div>

      {errorMessage ? (
        <p
          aria-live="polite"
          className={styles["sw-session-error-r4n8k2"]}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className={styles["sw-session-empty-b7p2m5"]}>
          No administrative sessions are available.
        </p>
      ) : (
        <ul className={styles["sw-session-list-f2q9m6"]}>
          {sessions.map((session) => (
            <li className={styles["sw-session-item-k5m3v8"]} key={session.id}>
              <div className={styles["sw-session-details-z7p4n2"]}>
                <div className={styles["sw-session-title-h9m2q5"]}>
                  <strong>{session.userName}</strong>
                  {session.isCurrent ? <span>Current session</span> : null}
                  {!session.isActive ? <span>Inactive</span> : null}
                </div>
                <p>{session.userEmail}</p>
                <p title={session.userAgent}>{session.userAgent}</p>
                <dl className={styles["sw-session-metadata-d3n8p7"]}>
                  <div>
                    <dt>Last active</dt>
                    <dd>
                      <time dateTime={session.lastSeenAt}>
                        {formatUtc(session.lastSeenAt)}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>
                      <time dateTime={session.createdAt}>
                        {formatUtc(session.createdAt)}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>
                      <time dateTime={session.expiresAt}>
                        {formatUtc(session.expiresAt)}
                      </time>
                    </dd>
                  </div>
                  <div>
                    <dt>Latest TOTP</dt>
                    <dd>
                      {session.stepUpVerifiedAt ? (
                        <time dateTime={session.stepUpVerifiedAt}>
                          {formatUtc(session.stepUpVerifiedAt)}
                        </time>
                      ) : (
                        "Not completed"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {!session.isCurrent ? (
                <Buttons.Button
                  disabled={isPending}
                  kind="secondary"
                  onClick={() => {
                    if (
                      !globalThis.confirm(
                        `Revoke the selected session for ${session.userEmail}?`,
                      )
                    ) {
                      return;
                    }

                    setPendingSessionId(session.id);
                    setErrorMessage(null);
                    startTransition(async () => {
                      const response = await fetch(
                        `/api/admin/sessions/${encodeURIComponent(session.id)}`,
                        {
                          method: "DELETE",
                        },
                      );

                      if (response.status === 401) {
                        router.replace("/login?redirectTo=%2Fsettings");
                        router.refresh();
                        return;
                      }

                      if (response.status === 403) {
                        router.replace(
                          "/login/mfa?redirectTo=%2Fsettings&reason=step-up",
                        );
                        router.refresh();
                        return;
                      }

                      if (!response.ok) {
                        setErrorMessage(
                          "The session could not be revoked. Refresh and try again.",
                        );
                        setPendingSessionId(null);
                        return;
                      }

                      setPendingSessionId(null);
                      router.refresh();
                    });
                  }}
                  size="small"
                  type="button"
                >
                  {isPending && pendingSessionId === session.id
                    ? "Revoking..."
                    : "Revoke session"}
                </Buttons.Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
