import styles from "./trust-strip.module.css";

type TrustStripItem = {
  value: string;
  caption: string;
};

type TrustStripProps = {
  label: string;
  items: readonly TrustStripItem[];
};

export function TrustStrip({ label, items }: TrustStripProps) {
  return (
    <section className={styles.root}>
      <div className={styles.grid}>
        <p className={styles.label}>{label}</p>
        <div className={styles.items}>
          {items.map((item) => (
            <article className={styles.item} key={item.value}>
              <p className={styles.value}>{item.value}</p>
              <p className={styles.caption}>{item.caption}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
