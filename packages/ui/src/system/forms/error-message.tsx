import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./error-message.module.css";

export function ErrorMessage({
  className,
  role = "alert",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      {...props}
      aria-live="polite"
      className={mergeClassNames(styles["errormessage-root-l52bml"], className)}
      data-component-status="styled"
      role={role}
    />
  );
}
