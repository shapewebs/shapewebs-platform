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
        styles["link-root-zvbqny"],
        underline === "always"
          ? styles["link-always-6mytr2"]
          : underline === "none"
            ? styles["link-none-zg0f8w"]
            : styles["link-hover-p8wt5w"],
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
