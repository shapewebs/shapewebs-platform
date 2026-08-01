"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Buttons, Layout } from "@shapewebs/ui";

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
    <Layout.Card className={styles["session-root-3mf22o"]}>
      <div className={styles["session-header-mymn81"]}>
        <div>
          <p className={styles["session-eyebrow-uywjd6"]}>Security</p>
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
          className={styles["session-error-sgujpf"]}
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {sessions.length === 0 ? (
        <p className={styles["session-empty-394br8"]}>
          No administrative sessions are available.
        </p>
      ) : (
        <ul className={styles["session-list-8nkv5n"]}>
          {sessions.map((session) => (
            <li className={styles["session-item-nxu4vh"]} key={session.id}>
              <div className={styles["session-details-e9xjke"]}>
                <div className={styles["session-title-5y8svb"]}>
                  <strong>{session.userName}</strong>
                  {session.isCurrent ? <span>Current session</span> : null}
                  {!session.isActive ? <span>Inactive</span> : null}
                </div>
                <p>{session.userEmail}</p>
                <p title={session.userAgent}>{session.userAgent}</p>
                <dl className={styles["session-metadata-7xsicr"]}>
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
                  pending={isPending && pendingSessionId === session.id}
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
    </Layout.Card>
  );
}
