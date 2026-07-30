import { Layout } from "@shapewebs/ui";

import { SiteBrand } from "./site-brand";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles["sw-footer-shell-d7q3t5"]}>
      <Layout.Container size="wide">
        <Layout.Cluster
          className={styles["sw-footer-content-e8r4v6"]}
          justify="between"
        >
          <SiteBrand compact />
          <a
            className={styles["sw-footer-contact-f9s5w7"]}
            href="mailto:info@shapewebs.com"
          >
            info@shapewebs.com
          </a>
        </Layout.Cluster>
      </Layout.Container>
    </footer>
  );
}
