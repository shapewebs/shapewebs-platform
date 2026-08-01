import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./container.module.css";

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "copy" | "default" | "full" | "wide";
};

function getSizeClass(size: NonNullable<ContainerProps["size"]>) {
  switch (size) {
    case "copy":
      return styles["container-copy-2zwjkw"];
    case "full":
      return styles["container-full-ns4ftp"];
    case "wide":
      return styles["container-wide-ksrwtj"];
    default:
      return styles["container-default-glz8z0"];
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
        styles["container-root-y2z36l"],
        getSizeClass(size),
        className,
      )}
      data-component-status="styled"
      {...props}
    />
  );
}
