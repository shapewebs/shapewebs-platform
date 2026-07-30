import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./toggle-button.module.css";

export type ToggleButtonProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: ReactNode;
};

export function ToggleButton({
  className,
  id,
  label,
  ...props
}: ToggleButtonProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      className={mergeClassNames(styles["sw-toggle-root-f7s3w9"], className)}
      htmlFor={inputId}
    >
      <input
        className={styles["sw-toggle-input-g8t4x1"]}
        data-component-status="styled"
        id={inputId}
        type="checkbox"
        {...props}
      />
      <span aria-hidden="true" className={styles["sw-toggle-track-h9v5y2"]} />
      {label ? (
        <span className={styles["sw-toggle-label-j1w6z3"]}>{label}</span>
      ) : null}
    </label>
  );
}
