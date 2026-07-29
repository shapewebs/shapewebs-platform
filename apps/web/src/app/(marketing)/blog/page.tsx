import type { Metadata } from "next";
import Link from "next/link";
import { getDocumentPath, getResolvedContentList } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getWebSanityRuntime } from "@/lib/sanity";
import styles from "./page.module.css";

export const revalidate = 300;

export const metadata: Metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Publishing notes on website systems, content architecture, design decisions, and the thinking behind Shapewebs work.",
  path: "/blog",
  keywords: [
    "Shapewebs blog",
    "website insights",
    "CMS notes",
    "design systems",
  ],
});

export default async function BlogIndexPage() {
  const sanity = getWebSanityRuntime();
  const posts = sanity
    ? (
        await sanity.repository.listBlogPosts({
          limit: 100,
          locale: "en",
        })
      ).map((post) => ({
        documentId: post._id,
        href: `/blog/${post.slug.current}`,
        summary: post.excerpt,
        title: post.title,
      }))
    : (await getResolvedContentList("post")).map((post) => ({
        documentId: post.documentId,
        href: getDocumentPath(post),
        summary: post.summary,
        title: post.title,
      }));

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
              <Link className={styles.linkN4m8p5} href={post.href}>
                Read article
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
