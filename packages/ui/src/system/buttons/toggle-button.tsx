import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./toggle-button.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

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
    <label className={mergeClassNames(styles.wrapper, className)} htmlFor={inputId}>
      <input
        className={styles.input}
        data-component-status="styled"
        id={inputId}
        type="checkbox"
        {...props}
      />
      <span className={styles.track} />
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
}
