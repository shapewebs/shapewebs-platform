import type { Metadata } from "next";
import Link from "next/link";
import { getDocumentPath, getResolvedContentList } from "@/lib/content";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "../blog/page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Projects",
  description:
    "Selected website projects and case studies from Shapewebs, focused on presentation, clarity, and trust-building.",
  path: "/projects",
  keywords: ["Shapewebs projects", "website case studies", "portfolio websites"],
});

export default async function ProjectsIndexPage() {
  const projects = await getResolvedContentList("project");

  return (
    <section className={styles.pageG5m2q1}>
      <div className={styles.containerJ6m3q2}>
        <header className={styles.headerQ2m8v4}>
          <p className={styles.eyebrowT8m1q3}>Projects</p>
          <h1>Selected website systems</h1>
        </header>

        <div className={styles.listP4m6q8}>
          {projects.map((project) => (
            <article className={styles.cardB6m2q9} key={project.documentId}>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <Link className={styles.linkN4m8p5} href={getDocumentPath(project)}>
                View project
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
