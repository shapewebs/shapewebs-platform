import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./alert.module.css";

export type AlertTone = "error" | "info" | "success" | "warning";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AlertTone;
};

export function Alert({
  className,
  role,
  tone = "info",
  ...props
}: AlertProps) {
  const ariaLive =
    props["aria-live"] ?? (tone === "error" ? "assertive" : "polite");

  return (
    <div
      {...props}
      aria-live={ariaLive}
      className={mergeClassNames(styles["alert-root-0vn0nu"], className)}
      data-component-status="styled"
      data-slot="alert"
      data-tone={tone}
      role={role ?? (tone === "error" ? "alert" : "status")}
    />
  );
}
