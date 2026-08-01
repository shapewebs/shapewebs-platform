import type { ReactNode } from "react";

import { Spinner } from "../feedback/spinner";
import styles from "./passkey-frame.module.css";

export type PasskeyFrameStatus =
  "cancelled" | "error" | "unavailable" | "unsupported" | "waiting";

function getPasskeyContent(status: PasskeyFrameStatus) {
  switch (status) {
    case "cancelled":
      return {
        description:
          "No credential was used. You can choose another sign-in method.",
        title: "Passkey request cancelled",
      };
    case "error":
      return {
        description:
          "The credential could not be verified. No account changes were made.",
        title: "Passkey sign-in failed",
      };
    case "unsupported":
      return {
        description:
          "This browser or device cannot use the configured passkey method.",
        title: "Passkeys are not supported here",
      };
    case "waiting":
      return {
        description: "Follow the secure prompt from your browser or device.",
        title: "Waiting for a passkey",
      };
    default:
      return {
        description:
          "The interface is prepared, but passkey sign-in is not enabled yet.",
        title: "Passkeys are coming later",
      };
  }
}

export function PasskeyFrame({
  description,
  status = "unavailable",
  title,
}: {
  description?: ReactNode;
  status?: PasskeyFrameStatus;
  title?: ReactNode;
}) {
  const content = getPasskeyContent(status);

  return (
    <div
      aria-live="polite"
      className={styles["passkey-root-oaytgs"]}
      data-component-status="styled"
      data-passkey-status={status}
      data-slot="passkey-frame"
      role="status"
    >
      <div className={styles["passkey-icon-90ngh4"]}>
        {status === "waiting" ? (
          <Spinner announce={false} size="sm" />
        ) : (
          <svg aria-hidden="true" viewBox="0 0 20 20">
            <circle cx="7" cy="8" fill="none" r="3.25" />
            <path d="M10 10.5h7m-2 0v2m-2-2v2" fill="none" />
          </svg>
        )}
      </div>
      <div className={styles["passkey-content-ca6gnd"]}>
        <p className={styles["passkey-title-scaq1p"]}>
          {title ?? content.title}
        </p>
        <div className={styles["passkey-copy-67r3ia"]}>
          <p className={styles["passkey-description-y7flpw"]}>
            {description ?? content.description}
          </p>
        </div>
      </div>
    </div>
  );
}
