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
        styles["sw-brand-link-a8m3q6"],
        compact ? styles["sw-brand-compact-b9n4r7"] : undefined,
        className,
      )}
      href="/"
      prefetch={false}
    >
      <Brand.ShapewebsBrand compact={compact} />
    </Link>
  );
}
