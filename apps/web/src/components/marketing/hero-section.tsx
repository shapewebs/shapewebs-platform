import Link from "next/link";
import styles from "./hero-section.module.css";

type HeroProofPoint = {
  label: string;
  value: string;
};

type HeroAction = {
  href: string;
  label: string;
};

type HeroSectionProps = {
  eyebrow?: string;
  title: string;
  body: string;
  primaryAction: HeroAction;
  secondaryAction?: HeroAction;
  proofPoints?: readonly HeroProofPoint[];
};

export function HeroSection({
  eyebrow,
  title,
  body,
  primaryAction,
  secondaryAction,
  proofPoints = [],
}: HeroSectionProps) {
  return (
    <section className={styles.root}>
      <div className={styles.panel}>
        <div className={styles.grid}>
          <div className={styles.content}>
            {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.body}>{body}</p>
            <div className={styles.actions}>
              <Link className={styles.primaryLink} href={primaryAction.href}>
                {primaryAction.label}
              </Link>
              {secondaryAction ? (
                <Link className={styles.secondaryLink} href={secondaryAction.href}>
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>

          {proofPoints.length ? (
            <ul className={styles.proofList}>
              {proofPoints.map((point) => (
                <li className={styles.proofItem} key={point.label}>
                  <span className={styles.proofValue}>{point.value}</span>
                  <p className={styles.proofLabel}>{point.label}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
