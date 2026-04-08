import type { Metadata } from "next";
import Link from "next/link";
import { getDocumentPath, getResolvedContentList } from "@/lib/content";
import styles from "../blog/page.module.css";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Browse early Shapewebs portfolio entries and project directions for client-facing website design.",
};

export default async function WorkPage() {
  const projects = await getResolvedContentList("project");

  return (
    <section className={styles.pageG5m2q1}>
      <div className={styles.containerJ6m3q2}>
        <header className={styles.headerQ2m8v4}>
          <p className={styles.eyebrowT8m1q3}>Work</p>
          <h1>Portfolio and case studies</h1>
        </header>

        <div className={styles.listP4m6q8}>
          {projects.map((project) => (
            <article className={styles.cardB6m2q9} key={project.documentId}>
              <h2>{project.title}</h2>
              <p>{project.summary}</p>
              <Link className={styles.linkN4m8p5} href={getDocumentPath(project).replace("/projects/", "/work/")}>
                View work entry
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
