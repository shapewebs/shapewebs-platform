import { Layout, Navigation } from "@shapewebs/ui";

import { AdminPage } from "@/components/admin-page";
import styles from "./page.module.css";

const workAreas = [
  {
    description:
      "Create and review structured pages and editorial content before publication.",
    href: "/content",
    label: "Content",
  },
  {
    description:
      "Upload and inspect private, normalized source images for publishing workflows.",
    href: "/media",
    label: "Media",
  },
  {
    description:
      "Review contact and project enquiries stored in the durable lead repository.",
    href: "/submissions",
    label: "Submissions",
  },
  {
    description:
      "Manage login methods, active sessions, organization settings, and audit evidence.",
    href: "/settings",
    label: "Operations",
  },
] as const;

export default function DashboardPage() {
  return (
    <AdminPage
      description={
        <p>
          One private workspace for publishing, media, enquiries, and platform
          operations.
        </p>
      }
      eyebrow="Workspace"
      title="Overview"
    >
      <section
        aria-labelledby="workspace-areas"
        className={styles["dashboard-section-v3nttd"]}
      >
        <h2 className={styles["dashboard-heading-t8wg1r"]} id="workspace-areas">
          Work areas
        </h2>
        <div className={styles["dashboard-grid-xfbspi"]}>
          {workAreas.map((area) => (
            <Layout.Card
              className={styles["dashboard-card-pd6car"]}
              key={area.href}
              tone="default"
            >
              <div className={styles["dashboard-cardcopy-1kgtdr"]}>
                <h3>{area.label}</h3>
                <p>{area.description}</p>
              </div>
              <Navigation.Link href={area.href} underline="none">
                Open {area.label.toLowerCase()}
                <span aria-hidden="true">→</span>
              </Navigation.Link>
            </Layout.Card>
          ))}
        </div>
      </section>
    </AdminPage>
  );
}
