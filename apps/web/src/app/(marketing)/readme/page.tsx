import type { Metadata } from "next";
import { Buttons, Feedback, Navigation, componentRegistry } from "@shapewebs/ui";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "README",
  description: "Internal component inventory for the Shapewebs UI system.",
  path: "/readme",
  noIndex: true,
});

const componentSections = [
  { key: "buttons", title: "Buttons" },
  { key: "collections", title: "Collections" },
  { key: "colors", title: "Colors" },
  { key: "controls", title: "Controls" },
  { key: "dataDisplay", title: "Data display" },
  { key: "dateAndTime", title: "Date and time" },
  { key: "feedback", title: "Feedback" },
  { key: "forms", title: "Forms" },
  { key: "layout", title: "Layout" },
  { key: "media", title: "Media" },
  { key: "navigation", title: "Navigation" },
  { key: "overlays", title: "Overlays" },
  { key: "figures", title: "Figures" },
  { key: "typography", title: "Typography" },
  { key: "utilities", title: "Utilities" },
] as const;

function getCreatedComponentNames(sectionKey: (typeof componentSections)[number]["key"]) {
  if (sectionKey === "figures") {
    return [];
  }

  const registryKey =
    sectionKey === "dataDisplay"
      ? "dataDisplay"
      : sectionKey === "dateAndTime"
        ? "dateAndTime"
        : sectionKey;

  const section = componentRegistry[registryKey as keyof typeof componentRegistry];

  return Object.entries(section)
    .filter(([, status]) => status === "styled")
    .map(([name]) => name);
}

export default function ReadmePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Component inventory</p>
        <h1 className={styles.title}>Shapewebs UI README</h1>
        <p className={styles.description}>
          This page is only for viewing the current system components in the order you requested.
          It is not meant to be a marketing page. Families that are not built yet stay listed here
          so we can fill them in one by one.
        </p>
      </header>

      {componentSections.map((section) => {
        const createdComponents = getCreatedComponentNames(section.key);

        return (
          <section className={styles.section} key={section.key}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <p className={styles.sectionMeta}>
                {createdComponents.length
                  ? `Created: ${createdComponents.join(", ")}`
                  : "No created components yet."}
              </p>
            </div>

            {section.key === "buttons" ? (
              <div className={styles.componentBlock}>
                <h3 className={styles.componentTitle}>Button family</h3>
                <div className={styles.demoGrid}>
                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>Button</p>
                    <div className={styles.buttonStack}>
                      <Buttons.Button kind="primary">Primary</Buttons.Button>
                      <Buttons.Button kind="secondary">Secondary</Buttons.Button>
                      <Buttons.Button kind="tertiary">Tertiary</Buttons.Button>
                      <Buttons.Button kind="ghost">Ghost</Buttons.Button>
                    </div>
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>ButtonGroup</p>
                    <Buttons.ButtonGroup className={styles.buttonStack}>
                      <Buttons.Button kind="secondary" size="small">
                        First
                      </Buttons.Button>
                      <Buttons.Button kind="secondary" size="small">
                        Second
                      </Buttons.Button>
                      <Buttons.Button kind="secondary" size="small">
                        Third
                      </Buttons.Button>
                    </Buttons.ButtonGroup>
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>CloseButton</p>
                    <Buttons.CloseButton />
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>ToggleButton</p>
                    <div className={styles.toggleStack}>
                      <Buttons.ToggleButton defaultChecked label="Notifications" />
                      <Buttons.ToggleButton label="Maintenance mode" />
                    </div>
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>ToggleButtonGroup</p>
                    <Buttons.ToggleButtonGroup className={styles.toggleStack}>
                      <Buttons.ToggleButton defaultChecked label="Email" />
                      <Buttons.ToggleButton label="SMS" />
                      <Buttons.ToggleButton label="Push" />
                    </Buttons.ToggleButtonGroup>
                  </div>
                </div>
              </div>
            ) : null}

            {section.key === "feedback" ? (
              <div className={styles.componentBlock}>
                <h3 className={styles.componentTitle}>Spinner</h3>
                <p className={styles.componentNote}>
                  Built around the HeroUI spinner reference, but converted into this project’s own
                  TypeScript and CSS Modules structure.
                </p>
                <div className={styles.demoGrid}>
                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>Basic</p>
                    <div className={styles.demoContent}>
                      <div className={styles.spinnerCurrent}>
                        <Feedback.Spinner />
                      </div>
                    </div>
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>Colors</p>
                    <div className={styles.demoContent}>
                      <div className={styles.spinnerCurrent}>
                        <Feedback.Spinner color="current" />
                      </div>
                      <Feedback.Spinner color="accent" />
                      <Feedback.Spinner color="success" />
                      <Feedback.Spinner color="warning" />
                      <Feedback.Spinner color="danger" />
                    </div>
                  </div>

                  <div className={styles.demoRow}>
                    <p className={styles.demoLabel}>Sizes</p>
                    <div className={styles.demoContent}>
                      <Feedback.Spinner size="sm" color="accent" />
                      <Feedback.Spinner size="md" color="accent" />
                      <Feedback.Spinner size="lg" color="accent" />
                      <Feedback.Spinner size="xl" color="accent" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {section.key === "navigation" ? (
              <div className={styles.componentBlock}>
                <h3 className={styles.componentTitle}>Link</h3>
                <div className={styles.demoRow}>
                  <p className={styles.demoLabel}>Navigation.Link</p>
                  <div className={styles.navigationPreview}>
                    <Navigation.Link href="/contact">Open contact route</Navigation.Link>
                  </div>
                </div>
              </div>
            ) : null}

            {!["buttons", "feedback", "navigation"].includes(section.key) ? (
              createdComponents.length ? (
                <div className={styles.list}>
                  {createdComponents.map((name) => (
                    <span className={styles.listItem} key={name}>
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Nothing built in this category yet.</p>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
