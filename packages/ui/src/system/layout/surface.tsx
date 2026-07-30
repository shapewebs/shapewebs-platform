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
      return styles["sw-surface-raised-p4a1d7"];
    case "sunken":
      return styles["sw-surface-sunken-q5b2e8"];
    default:
      return styles["sw-surface-base-n3z9c6"];
  }
}

function getPaddingClass(padding: NonNullable<SurfaceProps["padding"]>) {
  switch (padding) {
    case "large":
      return styles["sw-surface-large-v9f6j3"];
    case "none":
      return styles["sw-surface-none-r6c3f9"];
    case "small":
      return styles["sw-surface-small-s7d4g1"];
    default:
      return styles["sw-surface-medium-t8e5h2"];
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
        styles["sw-surface-root-m2y8b5"],
        getLevelClass(level),
        getPaddingClass(padding),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
