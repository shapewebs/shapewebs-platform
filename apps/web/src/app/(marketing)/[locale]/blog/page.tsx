import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublishedContentList } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import { getWebSanityRuntime } from "@/lib/sanity";
import styles from "../../blog/page.module.css";

export const revalidate = 300;

type LocalizedBlogIndexPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({
  params,
}: LocalizedBlogIndexPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "da-DK") {
    return {};
  }

  return buildPageMetadata({
    description:
      "Shapewebs-noter om websitesystemer, indholdsarkitektur og designbeslutninger.",
    path: "/da-DK/blog",
    title: "Blog",
  });
}

export default async function LocalizedBlogIndexPage({
  params,
}: LocalizedBlogIndexPageProps) {
  const { locale } = await params;

  if (locale === "en") {
    permanentRedirect("/blog");
  }

  if (locale !== "da-DK") {
    notFound();
  }

  const sanity = getWebSanityRuntime();
  const posts = sanity
    ? (
        await sanity.repository.listBlogPosts({
          limit: 100,
          locale: "da-DK",
        })
      ).map((post) => ({
        documentId: post._id,
        href: `/da-DK/blog/${post.slug.current}`,
        summary: post.excerpt,
        title: post.title,
      }))
    : (await getPublishedContentList("post", "da-DK")).map((post) => ({
        documentId: post.documentId,
        href: `/da-DK/blog/${post.slug}`,
        summary: post.summary,
        title: post.title,
      }));

  return (
    <section className={styles.pageG5m2q1}>
      <div className={styles.containerJ6m3q2}>
        <header className={styles.headerQ2m8v4}>
          <p className={styles.eyebrowT8m1q3}>Blog</p>
          <h1>Noter om publicering og platforme</h1>
        </header>

        <div className={styles.listP4m6q8}>
          {posts.map((post) => (
            <article className={styles.cardB6m2q9} key={post.documentId}>
              <h2>{post.title}</h2>
              <p>{post.summary}</p>
              <Link className={styles.linkN4m8p5} href={post.href}>
                Læs artiklen
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
