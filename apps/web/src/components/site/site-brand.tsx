import Link from "next/link";

import { mergeClassNames } from "@shapewebs/ui/merge-class-names";
import { ShapewebsBrand } from "@shapewebs/ui/shapewebs-brand";

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
      <ShapewebsBrand compact={compact} />
    </Link>
  );
}
