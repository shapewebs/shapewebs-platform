import Link from "next/link";
import styles from "./cta-section.module.css";

type CtaAction = {
  href: string;
  label: string;
};

type CtaSectionProps = {
  eyebrow?: string;
  title: string;
  body: string;
  primaryAction: CtaAction;
  secondaryAction?: CtaAction;
};

export function CtaSection({
  eyebrow,
  title,
  body,
  primaryAction,
  secondaryAction,
}: CtaSectionProps) {
  return (
    <section className={styles.root}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2 className={styles.title}>{title}</h2>
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
    </section>
  );
}
