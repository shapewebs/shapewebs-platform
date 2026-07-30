import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./spinner.module.css";

export type SpinnerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color"
> & {
  color?: "current" | "accent" | "success" | "warning" | "danger";
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

function getColorClass(color: NonNullable<SpinnerProps["color"]>) {
  switch (color) {
    case "accent":
      return styles["sw-spinner-accent-v1f6j3"];
    case "success":
      return styles["sw-spinner-success-w2g7k4"];
    case "warning":
      return styles["sw-spinner-warning-x3h8m5"];
    case "danger":
      return styles["sw-spinner-danger-y4j9n6"];
    default:
      return styles["sw-spinner-current-t9e5h2"];
  }
}

function getSizeClass(size: NonNullable<SpinnerProps["size"]>) {
  switch (size) {
    case "sm":
      return styles["sw-spinner-small-z5k1p7"];
    case "lg":
      return styles["sw-spinner-large-a6m2q8"];
    case "xl":
      return styles["sw-spinner-xlarge-b7n3r9"];
    default:
      return styles["sw-spinner-medium-c8p4s1"];
  }
}

export function Spinner({
  className,
  color = "current",
  label = "Loading",
  role = "status",
  size = "md",
  ...props
}: SpinnerProps) {
  return (
    <div
      aria-live="polite"
      className={mergeClassNames(
        styles["sw-spinner-root-d9q5t2"],
        getColorClass(color),
        getSizeClass(size),
        className,
      )}
      data-component-status="styled"
      data-slot="spinner"
      role={role}
      {...props}
    >
      <svg
        aria-hidden="true"
        className={styles["sw-spinner-icon-e1r6v3"]}
        data-slot="spinner-icon"
        viewBox="0 0 24 24"
      >
        <circle
          className={styles["sw-spinner-track-f2s7w4"]}
          cx="12"
          cy="12"
          r="9"
        />
        <path
          className={styles["sw-spinner-arc-g3t8x5"]}
          d="M12 3a9 9 0 0 1 9 9"
        />
      </svg>
      <span className={styles["sw-spinner-label-h4v9y6"]}>{label}</span>
    </div>
  );
}
