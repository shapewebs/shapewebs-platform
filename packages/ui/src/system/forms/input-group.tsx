import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./input-group.module.css";

export type InputGroupProps = HTMLAttributes<HTMLDivElement> & {
  invalid?: boolean;
};

export function InputGroup({
  className,
  invalid = false,
  ...props
}: InputGroupProps) {
  return (
    <div
      {...props}
      className={mergeClassNames(styles["inputgroup-root-ip0v6o"], className)}
      data-component-status="styled"
      data-invalid={invalid || undefined}
      data-slot="input-group"
    />
  );
}
