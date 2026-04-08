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

function getComponentNames(sectionKey: (typeof componentSections)[number]["key"]) {
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
  return Object.keys(section);
}

function renderPreview(
  sectionKey: (typeof componentSections)[number]["key"],
  componentName: string,
) {
  switch (`${sectionKey}:${componentName}`) {
    case "buttons:Button":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.Button kind="primary">Primary</Buttons.Button>
              <p className={styles.variantLabel}>primary</p>
            </div>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.Button kind="secondary">Secondary</Buttons.Button>
              <p className={styles.variantLabel}>secondary</p>
            </div>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.Button kind="tertiary">Tertiary</Buttons.Button>
              <p className={styles.variantLabel}>tertiary</p>
            </div>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.Button kind="ghost">Ghost</Buttons.Button>
              <p className={styles.variantLabel}>ghost</p>
            </div>
          </div>
        </div>
      );

    case "buttons:ButtonGroup":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
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
              <p className={styles.variantLabel}>default</p>
            </div>
          </div>
        </div>
      );

    case "buttons:CloseButton":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={styles.variantItem}>
              <Buttons.CloseButton />
              <p className={styles.variantLabel}>default</p>
            </div>
          </div>
        </div>
      );

    case "buttons:ToggleButton":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.ToggleButton defaultChecked label="Notifications" />
              <p className={styles.variantLabel}>checked</p>
            </div>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.ToggleButton label="Maintenance mode" />
              <p className={styles.variantLabel}>default</p>
            </div>
          </div>
        </div>
      );

    case "buttons:ToggleButtonGroup":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <Buttons.ToggleButtonGroup className={styles.toggleStack}>
                <Buttons.ToggleButton defaultChecked label="Email" />
                <Buttons.ToggleButton label="SMS" />
                <Buttons.ToggleButton label="Push" />
              </Buttons.ToggleButtonGroup>
              <p className={styles.variantLabel}>default</p>
            </div>
          </div>
        </div>
      );

    case "feedback:Spinner":
      return (
        <div className={styles.previewStack}>
          <div className={styles.demoCard}>
            <div className={styles.variantGrid}>
              <div className={styles.variantItem}>
                <div className={styles.spinnerCurrent}>
                  <Feedback.Spinner />
                </div>
                <p className={styles.variantLabel}>default</p>
              </div>
            </div>
          </div>

          <div className={styles.demoCard}>
            <div className={styles.variantGrid}>
              <div className={styles.variantItem}>
                <div className={styles.spinnerCurrent}>
                  <Feedback.Spinner color="current" />
                </div>
                <p className={styles.variantLabel}>current</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner color="accent" />
                <p className={styles.variantLabel}>accent</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner color="success" />
                <p className={styles.variantLabel}>success</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner color="warning" />
                <p className={styles.variantLabel}>warning</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner color="danger" />
                <p className={styles.variantLabel}>danger</p>
              </div>
            </div>
          </div>

          <div className={styles.demoCard}>
            <div className={styles.variantGrid}>
              <div className={styles.variantItem}>
                <Feedback.Spinner size="sm" color="accent" />
                <p className={styles.variantLabel}>sm</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner />
                <p className={styles.variantLabel}>md</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner size="lg" color="accent" />
                <p className={styles.variantLabel}>lg</p>
              </div>
              <div className={styles.variantItem}>
                <Feedback.Spinner size="xl" color="accent" />
                <p className={styles.variantLabel}>xl</p>
              </div>
            </div>
          </div>
        </div>
      );

    case "navigation:Link":
      return (
        <div className={styles.demoCard}>
          <div className={styles.variantGrid}>
            <div className={`${styles.variantItem} ${styles.variantItemWide}`}>
              <div className={styles.navigationPreview}>
                <Navigation.Link href="/contact">Open contact route</Navigation.Link>
              </div>
              <p className={styles.variantLabel}>default</p>
            </div>
          </div>
        </div>
      );

    default:
      return <div className={styles.emptyPreview} />;
  }
}

export default function ReadmePage() {
  return (
    <div className={styles.page}>
      {componentSections.map((section) => {
        const componentNames = getComponentNames(section.key);

        return (
          <section className={styles.section} key={section.key}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>

            {componentNames.map((componentName) => (
              <div className={styles.componentBlock} key={componentName}>
                <h3 className={styles.componentTitle}>{componentName}</h3>
                {renderPreview(section.key, componentName)}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
