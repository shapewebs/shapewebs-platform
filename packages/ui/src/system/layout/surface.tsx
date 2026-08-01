import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./surface.module.css";

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  level?: "base" | "raised" | "sunken";
  padding?: "large" | "medium" | "none" | "small";
};

function getLevelClass(level: NonNullable<SurfaceProps["level"]>) {
  switch (level) {
    case "raised":
      return styles["surface-raised-52nakb"];
    case "sunken":
      return styles["surface-sunken-3ignpz"];
    default:
      return styles["surface-base-8k9kt5"];
  }
}

function getPaddingClass(padding: NonNullable<SurfaceProps["padding"]>) {
  switch (padding) {
    case "large":
      return styles["surface-large-rd2mun"];
    case "none":
      return styles["surface-none-avqcyw"];
    case "small":
      return styles["surface-small-3cjx0o"];
    default:
      return styles["surface-medium-on5a3d"];
  }
}

export function Surface({
  className,
  level = "base",
  padding = "medium",
  ...props
}: SurfaceProps) {
  return (
    <div
      className={mergeClassNames(
        styles["surface-root-zimz1n"],
        getLevelClass(level),
        getPaddingClass(padding),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
