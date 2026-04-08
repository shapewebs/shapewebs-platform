import styles from "./service-feature-grid.module.css";

type ServiceFeature = {
  eyebrow?: string;
  title: string;
  body: string;
  points?: readonly string[];
};

type ServiceFeatureGridProps = {
  eyebrow?: string;
  title: string;
  intro: string;
  features: readonly ServiceFeature[];
};

export function ServiceFeatureGrid({
  eyebrow,
  title,
  intro,
  features,
}: ServiceFeatureGridProps) {
  return (
    <section className={styles.root}>
      <header className={styles.header}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.intro}>{intro}</p>
      </header>

      <div className={styles.grid}>
        {features.map((feature) => (
          <article className={styles.card} key={feature.title}>
            {feature.eyebrow ? <p className={styles.cardEyebrow}>{feature.eyebrow}</p> : null}
            <h3 className={styles.cardTitle}>{feature.title}</h3>
            <p className={styles.cardBody}>{feature.body}</p>
            {feature.points?.length ? (
              <ul className={styles.points}>
                {feature.points.map((point) => (
                  <li className={styles.point} key={point}>
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
