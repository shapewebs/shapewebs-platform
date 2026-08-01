import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./spinner.module.css";

export type SpinnerProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color"
> & {
  announce?: boolean;
  color?: "current" | "accent" | "success" | "warning" | "danger";
  label?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

function getColorClass(color: NonNullable<SpinnerProps["color"]>) {
  switch (color) {
    case "accent":
      return styles["spinner-accent-zvu555"];
    case "success":
      return styles["spinner-success-qdeuli"];
    case "warning":
      return styles["spinner-warning-v18gah"];
    case "danger":
      return styles["spinner-danger-gbnwo3"];
    default:
      return styles["spinner-current-8scmdu"];
  }
}

function getSizeClass(size: NonNullable<SpinnerProps["size"]>) {
  switch (size) {
    case "sm":
      return styles["spinner-small-c2t9ko"];
    case "lg":
      return styles["spinner-large-dl73u5"];
    case "xl":
      return styles["spinner-xlarge-mhuugu"];
    default:
      return styles["spinner-medium-3z6qhn"];
  }
}

export function Spinner({
  announce = true,
  className,
  color = "current",
  label = "Loading",
  role,
  size = "md",
  ...props
}: SpinnerProps) {
  return (
    <div
      aria-hidden={announce ? undefined : true}
      aria-live={announce ? "polite" : undefined}
      className={mergeClassNames(
        styles["spinner-root-19eyax"],
        getColorClass(color),
        getSizeClass(size),
        className,
      )}
      data-component-status="styled"
      data-slot="spinner"
      role={role ?? (announce ? "status" : undefined)}
      {...props}
    >
      <svg
        aria-hidden="true"
        className={styles["spinner-icon-qgt7pw"]}
        data-slot="spinner-icon"
        viewBox="0 0 24 24"
      >
        <circle
          className={styles["spinner-track-ic069b"]}
          cx="12"
          cy="12"
          r="9"
        />
        <path
          className={styles["spinner-arc-hah2od"]}
          d="M12 3a9 9 0 0 1 9 9"
        />
      </svg>
      {announce ? (
        <span className={styles["spinner-label-l5zn1u"]}>{label}</span>
      ) : null}
    </div>
  );
}
