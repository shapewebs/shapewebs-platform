import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./cluster.module.css";

export type ClusterProps = HTMLAttributes<HTMLDivElement> & {
  justify?: "between" | "center" | "start";
};

function getJustifyClass(justify: NonNullable<ClusterProps["justify"]>) {
  switch (justify) {
    case "between":
      return styles["cluster-between-4znvxu"];
    case "center":
      return styles["cluster-center-xln1yt"];
    default:
      return styles["cluster-start-rog1rg"];
  }
}

export function Cluster({
  className,
  justify = "start",
  ...props
}: ClusterProps) {
  return (
    <div
      className={mergeClassNames(
        styles["cluster-root-xbyglc"],
        getJustifyClass(justify),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
