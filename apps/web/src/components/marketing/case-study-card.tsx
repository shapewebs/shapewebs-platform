import Link from "next/link";
import styles from "./case-study-card.module.css";

type CaseStudyCardProps = {
  category: string;
  client: string;
  title: string;
  summary: string;
  tags: readonly string[];
  metrics: readonly string[];
  href: string;
};

export function CaseStudyCard({
  category,
  client,
  title,
  summary,
  tags,
  metrics,
  href,
}: CaseStudyCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <p className={styles.category}>{category}</p>
        <p className={styles.client}>{client}</p>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.summary}>{summary}</p>
      <div className={styles.tags}>
        {tags.map((tag) => (
          <span className={styles.tag} key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <ul className={styles.metrics}>
        {metrics.map((metric) => (
          <li className={styles.metric} key={metric}>
            {metric}
          </li>
        ))}
      </ul>
      <Link className={styles.link} href={href}>
        View case study
      </Link>
    </article>
  );
}
