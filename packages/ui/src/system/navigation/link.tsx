"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./link.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

export type LinkProps = ComponentProps<typeof NextLink> & {
  children: ReactNode;
  hintClassName?: string;
  labelClassName?: string;
  showPendingHint?: boolean;
};

function LinkHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={mergeClassNames(
        styles.hint,
        pending ? styles.hintPending : undefined,
        className,
      )}
    />
  );
}

export function Link({
  children,
  className,
  hintClassName,
  labelClassName,
  showPendingHint = true,
  ...props
}: LinkProps) {
  return (
    <NextLink
      className={mergeClassNames(styles.root, className)}
      data-component-status="styled"
      {...props}
    >
      <span className={mergeClassNames(styles.label, labelClassName)}>
        {children}
      </span>
      {showPendingHint ? <LinkHint className={hintClassName} /> : null}
    </NextLink>
  );
}
