import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./notification.module.css";

export type NotificationTone = "error" | "info" | "success" | "warning";
export type NotificationDelay = "immediate" | "initial";

export type NotificationProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  delay?: NotificationDelay;
  heading?: ReactNode;
  tone?: NotificationTone;
};

export type NotificationViewportProps = HTMLAttributes<HTMLDivElement>;

function NotificationIcon({ tone }: { tone: NotificationTone }) {
  if (tone === "success") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7.25" />
        <path d="m6.75 10.1 2.1 2.15 4.4-4.6" />
      </svg>
    );
  }

  if (tone === "warning") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M10 3.25 17 16H3L10 3.25Z" />
        <path d="M10 7.4v3.9M10 14.05v.05" />
      </svg>
    );
  }

  if (tone === "error") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="7.25" />
        <path d="m7.45 7.45 5.1 5.1M12.55 7.45l-5.1 5.1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 8.7v4.15M10 6.25v.05" />
    </svg>
  );
}

export function Notification({
  action,
  children,
  className,
  delay = "immediate",
  heading,
  role,
  tone = "info",
  ...props
}: NotificationProps) {
  const ariaLive =
    props["aria-live"] ?? (tone === "error" ? "assertive" : "polite");

  return (
    <div
      {...props}
      aria-live={ariaLive}
      className={mergeClassNames(styles["notification-root-xmx3ts"], className)}
      data-component-status="styled"
      data-delay={delay}
      data-has-heading={heading ? "true" : "false"}
      data-slot="notification"
      data-tone={tone}
      role={role ?? (tone === "error" ? "alert" : "status")}
    >
      <span aria-hidden="true" className={styles["notification-icon-dkkpcc"]}>
        <NotificationIcon tone={tone} />
      </span>

      <div className={styles["notification-content-x7e7jv"]}>
        {heading ? (
          <div className={styles["notification-heading-yafy00"]}>{heading}</div>
        ) : null}
        {children ? (
          <div className={styles["notification-copy-64022m"]}>{children}</div>
        ) : null}
      </div>

      {action ? (
        <div className={styles["notification-action-p3acz7"]}>{action}</div>
      ) : null}
    </div>
  );
}

export function NotificationViewport({
  "aria-label": ariaLabel = "Notifications",
  className,
  ...props
}: NotificationViewportProps) {
  return (
    <div
      {...props}
      aria-label={ariaLabel}
      className={mergeClassNames(
        styles["notification-viewport-0z2ihf"],
        className,
      )}
      data-component-status="styled"
      data-slot="notification-viewport"
      role="region"
    />
  );
}
