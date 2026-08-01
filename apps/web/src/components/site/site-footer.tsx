import { Container } from "@shapewebs/ui/container";
import { Link } from "@shapewebs/ui/link";

import { SiteBrand } from "./site-brand";
import styles from "./site-footer.module.css";
import {
  footerColumns,
  legalNavigation,
  type FooterLink,
} from "./site-navigation";
import { SiteThemeSelector } from "./site-theme-selector";

function FooterNavigationLink({ href, label }: FooterLink) {
  if (href.startsWith("mailto:")) {
    return <a href={href}>{label}</a>;
  }

  return (
    <Link href={href} underline="none">
      {label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles["footer-shell-zgc15z"]}>
      <Container className={styles["footer-container-qb1175"]} size="wide">
        <div className={styles["footer-grid-9417rb"]}>
          <div className={styles["footer-brand-1td1xu"]}>
            <SiteBrand />
            <p className={styles["footer-statement-lrdqx0"]}>
              Independent web design and development for ambitious businesses.
            </p>
            <p className={styles["footer-availability-jh0gx6"]}>
              <span aria-hidden="true" />
              Available for select projects
            </p>
            <a
              className={styles["footer-email-bcvglw"]}
              href="mailto:info@shapewebs.com"
            >
              info@shapewebs.com
            </a>
          </div>

          {footerColumns.map((column) => (
            <nav aria-label={column.label} key={column.label}>
              <h2 className={styles["footer-heading-qxjf4u"]}>
                {column.label}
              </h2>
              <ul className={styles["footer-links-8b97ek"]} role="list">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterNavigationLink {...link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles["footer-legal-r7v3x3"]}>
          <p>© {new Date().getFullYear()} Shapewebs</p>
          <SiteThemeSelector />
          <ul className={styles["footer-legallinks-r4zvif"]} role="list">
            {legalNavigation.map((link) => (
              <li key={link.href}>
                <FooterNavigationLink {...link} />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
