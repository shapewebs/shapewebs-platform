import type { ButtonHTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./close-button.module.css";

export type CloseButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label?: string;
};

export function CloseButton({
  className,
  label = "Close",
  type = "button",
  ...props
}: CloseButtonProps) {
  return (
    <button
      aria-label={label}
      className={mergeClassNames(
        styles["sw-closebutton-root-d5q1t7"],
        className,
      )}
      data-component-status="styled"
      type={type}
      {...props}
    >
      <svg
        aria-hidden="true"
        className={styles["sw-closebutton-icon-e6r2v8"]}
        viewBox="0 0 20 20"
      >
        <path d="m5 5 10 10M15 5 5 15" />
      </svg>
    </button>
  );
}
