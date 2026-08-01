import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./field-error.module.css";

export function FieldError({
  className,
  role = "alert",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      aria-live="polite"
      className={mergeClassNames(styles["fielderror-root-mbr31l"], className)}
      data-component-status="styled"
      role={role}
    />
  );
}
