import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./shapewebs-brand.module.css";

export type ShapewebsBrandProps = HTMLAttributes<HTMLSpanElement> & {
  compact?: boolean;
};

export function ShapewebsBrand({
  className,
  compact = false,
  ...props
}: ShapewebsBrandProps) {
  return (
    <span
      className={mergeClassNames(
        styles["sw-brand-root-a1m6q9"],
        compact ? styles["sw-brand-compact-b2n7r1"] : undefined,
        className,
      )}
      data-component-status="styled"
      {...props}
    >
      <svg
        aria-hidden="true"
        className={styles["sw-brand-mark-c3p8s2"]}
        viewBox="0 5.625 180 169.087"
      >
        <path d="M162 5.625 89.38 174.712H0V78.091C0 29.78 22.345 5.625 67.034 5.625H162Z" />
        <ellipse cx="150" cy="144.518" rx="30" ry="30.194" />
      </svg>
      {compact ? null : (
        <span className={styles["sw-brand-name-d4q9t3"]}>Shapewebs</span>
      )}
    </span>
  );
}
