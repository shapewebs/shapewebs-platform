import Link from "next/link";
import styles from "./blog-post-card.module.css";

type BlogPostCardProps = {
  category: string;
  date: string;
  readingTime: string;
  title: string;
  summary: string;
  href: string;
};

export function BlogPostCard({
  category,
  date,
  readingTime,
  title,
  summary,
  href,
}: BlogPostCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.meta}>
        <p className={styles.category}>{category}</p>
        <p className={styles.date}>{date}</p>
        <p className={styles.readingTime}>{readingTime}</p>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.summary}>{summary}</p>
      <Link className={styles.link} href={href}>
        Read article
      </Link>
    </article>
  );
}
