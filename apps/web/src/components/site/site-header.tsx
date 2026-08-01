import { Cluster } from "@shapewebs/ui/cluster";
import { Container } from "@shapewebs/ui/container";
import { SubmenuNavigation } from "@shapewebs/ui/submenu-navigation";

import { SiteBrand } from "./site-brand";
import styles from "./site-header.module.css";
import { primaryNavigation } from "./site-navigation";
import { SiteSearch } from "./site-search";

export function SiteHeader() {
  return (
    <header className={styles["header-shell-4tzdtn"]}>
      <Container className={styles["header-container-jfltkh"]} size="wide">
        <Cluster className={styles["header-content-s5ntpk"]} justify="between">
          <SiteBrand />
          <SubmenuNavigation
            ariaLabel="Primary navigation"
            items={primaryNavigation}
            slots={{ search: <SiteSearch /> }}
          />
        </Cluster>
      </Container>
    </header>
  );
}
