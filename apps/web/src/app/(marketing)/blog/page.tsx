import type { Metadata } from "next";
import Link from "next/link";
import { getDocumentPath, getResolvedContentList } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Publishing notes on website systems, content architecture, design decisions, and the thinking behind Shapewebs work.",
  path: "/blog",
  keywords: ["Shapewebs blog", "website insights", "CMS notes", "design systems"],
});

export default async function BlogIndexPage() {
  const posts = await getResolvedContentList("post");

  return (
    <section className={styles.pageG5m2q1}>
      <div className={styles.containerJ6m3q2}>
        <header className={styles.headerQ2m8v4}>
          <p className={styles.eyebrowT8m1q3}>Blog</p>
          <h1>Publishing and platform notes</h1>
        </header>

        <div className={styles.listP4m6q8}>
          {posts.map((post) => (
            <article className={styles.cardB6m2q9} key={post.documentId}>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
              <Link className={styles.linkN4m8p5} href={getDocumentPath(post)}>
                Read article
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
