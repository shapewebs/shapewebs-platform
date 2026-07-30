import { Buttons, Layout } from "@shapewebs/ui";

import { SiteBrand } from "./site-brand";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles["sw-header-shell-a4m9q2"]}>
      <Layout.Container
        className={styles["sw-header-container-b5n1r3"]}
        size="wide"
      >
        <Layout.Cluster
          className={styles["sw-header-content-c6p2s4"]}
          justify="between"
        >
          <SiteBrand />
          <Buttons.ButtonAnchor
            href="mailto:info@shapewebs.com"
            kind="secondary"
            size="small"
          >
            Start a project
          </Buttons.ButtonAnchor>
        </Layout.Cluster>
      </Layout.Container>
    </header>
  );
}
