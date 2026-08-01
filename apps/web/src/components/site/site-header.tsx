import { Layout, Navigation } from "@shapewebs/ui";

import { SiteBrand } from "./site-brand";
import styles from "./site-header.module.css";
import { primaryNavigation } from "./site-navigation";
import { SiteSearch } from "./site-search";

export function SiteHeader() {
  return (
    <header className={styles["header-shell-4tzdtn"]}>
      <Layout.Container
        className={styles["header-container-jfltkh"]}
        size="wide"
      >
        <Layout.Cluster
          className={styles["header-content-s5ntpk"]}
          justify="between"
        >
          <SiteBrand />
          <Navigation.SubmenuNavigation
            ariaLabel="Primary navigation"
            items={primaryNavigation}
            slots={{ search: <SiteSearch /> }}
          />
        </Layout.Cluster>
      </Layout.Container>
    </header>
  );
}
