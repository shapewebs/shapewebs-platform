import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./button-group.module.css";

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  align?: "end" | "start";
};

export function ButtonGroup({
  align = "start",
  className,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={mergeClassNames(
        styles["sw-buttongroup-root-a2m7q4"],
        align === "end"
          ? styles["sw-buttongroup-end-b3n8r5"]
          : styles["sw-buttongroup-start-c4p9s6"],
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
