import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./stack.module.css";

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: 2 | 3 | 4 | 5 | 6 | 7 | 8;
};

function getGapClass(gap: NonNullable<StackProps["gap"]>) {
  switch (gap) {
    case 2:
      return styles["stack-gap2-p7k7s0"];
    case 3:
      return styles["stack-gap3-7jajgv"];
    case 5:
      return styles["stack-gap5-a8wi33"];
    case 6:
      return styles["stack-gap6-j4m2d3"];
    case 7:
      return styles["stack-gap7-acbvhb"];
    case 8:
      return styles["stack-gap8-j6xydf"];
    default:
      return styles["stack-gap4-46we4c"];
  }
}

export function Stack({ className, gap = 4, ...props }: StackProps) {
  return (
    <div
      className={mergeClassNames(
        styles["stack-root-obiaf3"],
        getGapClass(gap),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
