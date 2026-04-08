import { SiteLogo } from "./site-logo";
import { SiteLink } from "@/components/navigation/site-link";
import { SiteNavLink } from "./site-nav-link";
import { siteFooterGroups } from "./site-navigation-data";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.shellQ2m8d4}>
      <div className={styles.contentZ8k4q}>
        <div className={styles.gridL5p9r}>
          <div className={styles.logoColumnB7m3s}>
            <SiteLink
              aria-label="Shapewebs home"
              className={styles.logoLinkL9k4r}
              href="/"
              showPendingHint={false}
            >
              <SiteLogo className={styles.logoQ9j6p} variant="mark" />
            </SiteLink>
          </div>

          {siteFooterGroups.map((group) => (
            <section className={styles.columnB7m3s} key={group.title}>
              <h2 className={styles.subheadingH6k2p}>{group.title}</h2>
              <ul className={styles.listZ3n7q}>
                {group.items.map((item) => (
                  <li className={styles.listItemP5j8s} key={item.href}>
                    {item.external ? (
                      <a
                        className={styles.linkL9k4r}
                        href={item.href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <SiteNavLink
                        className={styles.linkL9k4r}
                        href={item.href}
                        variant="footer"
                      >
                        {item.label}
                      </SiteNavLink>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </footer>
  );
}
