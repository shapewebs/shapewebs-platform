import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./card.module.css";

export type CardProps = HTMLAttributes<HTMLElement> & {
  tone?: "default" | "quiet" | "raised";
};

function getToneClass(tone: NonNullable<CardProps["tone"]>) {
  switch (tone) {
    case "quiet":
      return styles["card-quiet-u9bpho"];
    case "raised":
      return styles["card-raised-8bsiys"];
    default:
      return undefined;
  }
}

export function Card({ className, tone = "default", ...props }: CardProps) {
  return (
    <article
      className={mergeClassNames(
        styles["card-root-ipf37r"],
        getToneClass(tone),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
