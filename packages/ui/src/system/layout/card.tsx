import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./card.module.css";

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: "default" | "quiet" | "raised";
};

function getToneClass(tone: NonNullable<CardProps["tone"]>) {
  switch (tone) {
    case "quiet":
      return styles["sw-card-quiet-x2h8m5"];
    case "raised":
      return styles["sw-card-raised-y3j9n6"];
    default:
      return undefined;
  }
}

export function Card({ className, tone = "default", ...props }: CardProps) {
  return (
    <article
      className={mergeClassNames(
        styles["sw-card-root-w1g7k4"],
        getToneClass(tone),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
