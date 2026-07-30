import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./toggle-button-group.module.css";

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function ToggleButtonGroup({
  className,
  orientation = "vertical",
  ...props
}: ToggleButtonGroupProps) {
  return (
    <div
      className={mergeClassNames(
        styles["sw-togglegroup-root-k2x7a4"],
        orientation === "horizontal"
          ? styles["sw-togglegroup-horizontal-m3y8b5"]
          : styles["sw-togglegroup-vertical-n4z9c6"],
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
