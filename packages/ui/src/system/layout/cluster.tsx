import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./cluster.module.css";

export type ClusterProps = HTMLAttributes<HTMLDivElement> & {
  justify?: "between" | "center" | "start";
};

function getJustifyClass(justify: NonNullable<ClusterProps["justify"]>) {
  switch (justify) {
    case "between":
      return styles["sw-cluster-between-q9b6e3"];
    case "center":
      return styles["sw-cluster-center-r1c7f4"];
    default:
      return styles["sw-cluster-start-s2d8g5"];
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
        styles["sw-cluster-root-p8a5d2"],
        getJustifyClass(justify),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
