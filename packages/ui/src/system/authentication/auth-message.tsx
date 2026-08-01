import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./auth-message.module.css";

export type AuthMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  tone?: "error" | "info" | "success";
};

export function AuthMessage({
  className,
  role,
  tone = "info",
  ...props
}: AuthMessageProps) {
  return (
    <p
      {...props}
      aria-live="polite"
      className={mergeClassNames(
        styles["authmessage-root-uso3sh"],
        tone === "error"
          ? styles["authmessage-error-n4rvsd"]
          : tone === "success"
            ? styles["authmessage-success-vfndk4"]
            : styles["authmessage-info-0x7g1k"],
        className,
      )}
      data-component-status="styled"
      data-slot="auth-message"
      role={role ?? (tone === "error" ? "alert" : "status")}
    />
  );
}
