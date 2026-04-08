import type { HTMLAttributes } from "react";
import styles from "./button-group.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement>;

export function ButtonGroup({ className, ...props }: ButtonGroupProps) {
  return (
    <div
      className={mergeClassNames(styles.root, className)}
      data-component-status="styled"
      {...props}
    />
  );
}
