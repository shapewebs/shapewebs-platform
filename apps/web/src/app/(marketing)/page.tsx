import type { Metadata } from "next";
import { siteConfig } from "@shapewebs/config";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Beautiful, fast websites built with intention",
  description: siteConfig.description,
  path: "/",
  keywords: [
    "custom websites",
    "business websites",
    "creative web design",
    "website strategy",
  ],
  openGraphTitle: siteConfig.openGraphTitle,
  openGraphDescription: siteConfig.openGraphDescription,
});

const approach = [
  {
    number: "01",
    title: "Find the signal",
    description:
      "Clarify the audience, the offer, and the one action the website needs to earn.",
  },
  {
    number: "02",
    title: "Shape the system",
    description:
      "Turn strategy into a distinctive visual language and a clear content structure.",
  },
  {
    number: "03",
    title: "Build for speed",
    description:
      "Engineer a lean, accessible Next.js experience and verify it before launch.",
  },
] as const;

export default function MarketingHomePage() {
  return (
    <>
      <section
        aria-labelledby="shapewebs-home-title"
        className={styles["sw-home-hero-p3q8v2"]}
      >
        <div className={styles["sw-home-grid-r6n1c4"]}>
          <div className={styles["sw-home-copy-k7m4d9"]}>
            <p className={styles["sw-home-eyebrow-n2f6r8"]}>
              Independent web design &amp; development
            </p>
            <h1
              className={styles["sw-home-title-x4c9p1"]}
              id="shapewebs-home-title"
            >
              Distinctive websites,
              <span> engineered for speed.</span>
            </h1>
            <p className={styles["sw-home-lede-t8j2w5"]}>
              Shapewebs creates custom websites for ambitious businesses,
              combining clear strategy, expressive design, and
              performance-minded engineering.
            </p>
            <div className={styles["sw-home-actions-b6k3s7"]}>
              <a className={styles["sw-home-primary-q5v7a2"]} href="/contact">
                Start a project
                <span aria-hidden="true">↗</span>
              </a>
              <a
                className={styles["sw-home-secondary-h3r8m6"]}
                href="#approach"
              >
                See the approach
              </a>
            </div>
          </div>

          <div aria-hidden="true" className={styles["sw-home-art-f7k2d9"]}>
            <div className={styles["sw-home-orbit-c4m8p2"]}>
              <span className={styles["sw-home-node-y6r3v1"]} />
              <span className={styles["sw-home-node-j9q4b7"]} />
              <span className={styles["sw-home-node-w2n6k8"]} />
              <div className={styles["sw-home-mark-a8t5h3"]}>
                <span />
                <span />
                <span />
              </div>
            </div>
            <p className={styles["sw-home-caption-d5p1x7"]}>
              Strategy · Design · Code
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="shapewebs-approach-title"
        className={styles["sw-home-approach-m8q2c5"]}
        id="approach"
      >
        <div className={styles["sw-home-intro-v4h7n2"]}>
          <p className={styles["sw-home-eyebrow-n2f6r8"]}>The approach</p>
          <h2
            className={styles["sw-home-heading-z3k9r6"]}
            id="shapewebs-approach-title"
          >
            One focused process, from first question to fast launch.
          </h2>
        </div>
        <ol className={styles["sw-home-steps-g6m1t8"]}>
          {approach.map((step) => (
            <li className={styles["sw-home-step-e2v7q4"]} key={step.number}>
              <span className={styles["sw-home-number-r9c3k5"]}>
                {step.number}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
