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
        styles["buttongroup-root-hg59sr"],
        align === "end"
          ? styles["buttongroup-end-ix8dho"]
          : styles["buttongroup-start-yeub3j"],
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
