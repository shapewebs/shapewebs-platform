import Link from "next/link";

import { Brand, mergeClassNames } from "@shapewebs/ui";

import styles from "./site-brand.module.css";

type SiteBrandProps = Readonly<{
  className?: string;
  compact?: boolean;
}>;

export function SiteBrand({ className, compact = false }: SiteBrandProps) {
  return (
    <Link
      aria-label="Shapewebs home"
      className={mergeClassNames(
        styles["brand-link-q0kxgw"],
        compact ? styles["brand-compact-kuxhlj"] : undefined,
        className,
      )}
      href="/"
      prefetch={false}
    >
      <Brand.ShapewebsBrand compact={compact} />
    </Link>
  );
}
