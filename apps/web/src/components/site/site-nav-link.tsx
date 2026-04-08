import { SiteLink, type SiteLinkProps } from "@/components/navigation/site-link";
import { mergeClassNames } from "@shapewebs/ui";
import styles from "./site-nav-link.module.css";

type SiteNavLinkVariant = "header" | "footer" | "submenu" | "mobile" | "cta";

export type SiteNavLinkProps = SiteLinkProps & {
  variant?: SiteNavLinkVariant;
};

const variantClassMap: Record<SiteNavLinkVariant, string> = {
  header: styles.headerV4m8k1,
  footer: styles.footerK7q2m5,
  submenu: styles.submenuR2p6v9,
  mobile: styles.mobileP8k3n1,
  cta: styles.ctaF5w2q8,
};

export function SiteNavLink({
  className,
  showPendingHint = false,
  variant = "header",
  ...props
}: SiteNavLinkProps) {
  return (
    <SiteLink
      className={mergeClassNames(
        styles.rootQ6t3m1,
        variantClassMap[variant],
        className,
      )}
      showPendingHint={showPendingHint}
      {...props}
    />
  );
}
