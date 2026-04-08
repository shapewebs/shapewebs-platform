import type { ButtonHTMLAttributes } from "react";
import styles from "./close-button.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

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
      className={mergeClassNames(styles.root, className)}
      data-component-status="styled"
      type={type}
      {...props}
    >
      <span aria-hidden className={styles.icon}>
        ×
      </span>
    </button>
  );
}
