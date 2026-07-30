import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./link.module.css";

export type LinkProps = ComponentProps<typeof NextLink> & {
  children: ReactNode;
  underline?: "always" | "hover" | "none";
};

export function Link({
  children,
  className,
  prefetch = false,
  underline = "hover",
  ...props
}: LinkProps) {
  return (
    <NextLink
      className={mergeClassNames(
        styles["sw-link-root-p5a1d7"],
        underline === "always"
          ? styles["sw-link-always-q6b2e8"]
          : underline === "none"
            ? styles["sw-link-none-r7c3f9"]
            : styles["sw-link-hover-s8d4g1"],
        className,
      )}
      data-component-status="styled"
      prefetch={prefetch}
      {...props}
    >
      {children}
    </NextLink>
  );
}
