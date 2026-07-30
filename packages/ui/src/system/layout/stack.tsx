import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./stack.module.css";

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
};

function getGapClass(gap: NonNullable<StackProps["gap"]>) {
  switch (gap) {
    case 2:
      return styles["sw-stack-gap2-f1s7w4"];
    case 3:
      return styles["sw-stack-gap3-g2t8x5"];
    case 5:
      return styles["sw-stack-gap5-j4w1z7"];
    case 6:
      return styles["sw-stack-gap6-k5x2a8"];
    case 7:
      return styles["sw-stack-gap7-m6y3b9"];
    case 8:
      return styles["sw-stack-gap8-n7z4c1"];
    default:
      return styles["sw-stack-gap4-h3v9y6"];
  }
}

export function Stack({ className, gap = 4, ...props }: StackProps) {
  return (
    <div
      className={mergeClassNames(
        styles["sw-stack-root-e9r6v3"],
        getGapClass(gap),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
