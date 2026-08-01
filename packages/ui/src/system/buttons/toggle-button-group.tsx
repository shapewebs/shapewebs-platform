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
        styles["togglegroup-root-zd1zgu"],
        orientation === "horizontal"
          ? styles["togglegroup-horizontal-bwtwro"]
          : styles["togglegroup-vertical-paxg5x"],
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
