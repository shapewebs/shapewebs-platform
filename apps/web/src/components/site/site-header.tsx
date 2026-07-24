import { SiteLink } from "@/components/navigation/site-link";
import { SiteLogo } from "./site-logo";
import { siteCallToAction, sitePrimaryLinks } from "./site-navigation-data";
import styles from "./site-header.module.css";

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  return (
    <ul
      className={
        mobile
          ? styles["sw-header-mobile-list-k3p7v2"]
          : styles["sw-header-nav-list-h6m2q9"]
      }
    >
      {sitePrimaryLinks.map((item) => (
        <li key={item.href}>
          <SiteLink
            className={
              mobile
                ? styles["sw-header-mobile-link-b8n4r1"]
                : styles["sw-header-nav-link-t5c9m3"]
            }
            href={item.href}
          >
            {item.label}
          </SiteLink>
        </li>
      ))}
      {mobile ? (
        <li>
          <SiteLink
            className={styles["sw-header-mobile-cta-x2d6j8"]}
            href={siteCallToAction.href}
          >
            {siteCallToAction.label}
          </SiteLink>
        </li>
      ) : null}
    </ul>
  );
}

export function SiteHeader() {
  return (
    <header className={styles["sw-header-shell-p4m8k2"]}>
      <div className={styles["sw-header-content-r7n2v5"]}>
        <SiteLink
          aria-label="Shapewebs home"
          className={styles["sw-header-logo-link-q9c3h6"]}
          href="/"
        >
          <SiteLogo className={styles["sw-header-logo-mark-f2k7m4"]} />
        </SiteLink>

        <nav
          aria-label="Primary navigation"
          className={styles["sw-header-desktop-nav-v6p1r8"]}
        >
          <NavigationLinks />
        </nav>

        <SiteLink
          className={styles["sw-header-desktop-cta-j3m9t5"]}
          href={siteCallToAction.href}
        >
          {siteCallToAction.label}
        </SiteLink>

        <details className={styles["sw-header-mobile-menu-y8q4n1"]}>
          <summary
            aria-label="Toggle menu"
            className={styles["sw-header-menu-toggle-c5r2k7"]}
          >
            <span aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </summary>
          <nav
            aria-label="Mobile navigation"
            className={styles["sw-header-mobile-panel-m7v3d9"]}
          >
            <NavigationLinks mobile />
          </nav>
        </details>
      </div>
    </header>
  );
}
