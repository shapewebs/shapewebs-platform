import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./container.module.css";

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "copy" | "default" | "full" | "wide";
};

function getSizeClass(size: NonNullable<ContainerProps["size"]>) {
  switch (size) {
    case "copy":
      return styles["sw-container-copy-a5m2q8"];
    case "full":
      return styles["sw-container-full-d8q5t2"];
    case "wide":
      return styles["sw-container-wide-c7p4s1"];
    default:
      return styles["sw-container-default-b6n3r9"];
  }
}

export function Container({
  className,
  size = "default",
  ...props
}: ContainerProps) {
  return (
    <div
      className={mergeClassNames(
        styles["sw-container-root-z4k1p7"],
        getSizeClass(size),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
