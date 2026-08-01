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
      className={mergeClassNames(styles["toggle-root-ffsnw5"], className)}
      htmlFor={inputId}
    >
      <input
        className={styles["toggle-input-o9ks01"]}
        data-component-status="styled"
        id={inputId}
        type="checkbox"
        {...props}
      />
      <span aria-hidden="true" className={styles["toggle-track-6eve9j"]} />
      {label ? (
        <span className={styles["toggle-label-d0c6i5"]}>{label}</span>
      ) : null}
    </label>
  );
}
