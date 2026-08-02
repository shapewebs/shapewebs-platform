import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import { ShapewebsBrand } from "../brand/shapewebs-brand";
import styles from "./auth-layout.module.css";

export type AuthLayoutProps = Readonly<{
  brandHref: string;
  brandLabel: string;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  overlay?: ReactNode;
  size?: "compact" | "expanded";
  title?: ReactNode;
}>;

export type AuthLinksProps = HTMLAttributes<HTMLDivElement> & {
  layout?: "inline" | "stacked";
};

export function AuthLayout({
  brandHref,
  brandLabel,
  children,
  description,
  eyebrow,
  footer,
  overlay,
  size = "compact",
  title,
}: AuthLayoutProps) {
  return (
    <main
      className={styles["authlayout-root-6l61tg"]}
      data-component-status="styled"
      data-slot="auth-layout"
      data-sw-theme="studio"
    >
      {overlay}

      <div
        className={mergeClassNames(
          styles["authlayout-container-ggeec5"],
          size === "expanded"
            ? styles["authlayout-expanded-7ikwah"]
            : styles["authlayout-compact-8krd5z"],
        )}
      >
        <Link
          aria-label={brandLabel}
          className={styles["authlayout-brand-y7iol3"]}
          href={brandHref}
          prefetch={false}
        >
          <ShapewebsBrand compact />
        </Link>

        {title ? (
          <header className={styles["authlayout-header-9va4rb"]}>
            {eyebrow ? (
              <p className={styles["authlayout-eyebrow-1mtknu"]}>{eyebrow}</p>
            ) : null}
            <h1 className={styles["authlayout-title-udn9j1"]}>{title}</h1>
            {description ? (
              <div className={styles["authlayout-description-1k31q3"]}>
                {description}
              </div>
            ) : null}
          </header>
        ) : null}

        <div className={styles["authlayout-content-k3v9rr"]}>{children}</div>

        {footer ? (
          <footer className={styles["authlayout-footer-tfkp3x"]}>
            {footer}
          </footer>
        ) : null}
      </div>
    </main>
  );
}

export function AuthStack({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={mergeClassNames(styles["authstack-root-pb19cq"], className)}
      data-component-status="styled"
      data-slot="auth-stack"
    />
  );
}

export function AuthActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={mergeClassNames(styles["authactions-root-n8vax6"], className)}
      data-component-status="styled"
      data-slot="auth-actions"
    />
  );
}

export function AuthLinks({
  className,
  layout = "inline",
  ...props
}: AuthLinksProps) {
  return (
    <div
      {...props}
      className={mergeClassNames(styles["authlinks-root-scjviz"], className)}
      data-component-status="styled"
      data-layout={layout}
      data-slot="auth-links"
    />
  );
}
