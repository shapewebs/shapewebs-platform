import type { HTMLAttributes } from "react";
import styles from "./toggle-button-group.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement>;

export function ToggleButtonGroup({
  className,
  ...props
}: ToggleButtonGroupProps) {
  return (
    <div
      className={mergeClassNames(styles.root, className)}
      data-component-status="styled"
      {...props}
    />
  );
}
