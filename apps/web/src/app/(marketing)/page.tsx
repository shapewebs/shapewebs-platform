import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@shapewebs/config";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "Websites that feel alive",
  description: siteConfig.description,
  path: "/",
  keywords: [
    "independent web design studio",
    "high performance websites",
    "Next.js web development",
    "creative digital experiences",
  ],
  openGraphTitle: siteConfig.openGraphTitle,
  openGraphDescription: siteConfig.openGraphDescription,
});

const studioDisciplines = [
  "Strategy",
  "Art direction",
  "Experience design",
  "Next.js engineering",
] as const;

const principles = [
  {
    number: "01",
    eyebrow: "Distinctive",
    title: "A point of view, not a preset.",
    description:
      "A visual system shaped around your story—so the result could only belong to your business.",
    visual: "identity",
  },
  {
    number: "02",
    eyebrow: "Useful",
    title: "Every detail earns its place.",
    description:
      "Clear journeys, persuasive content, and thoughtful interactions turn attention into action.",
    visual: "journey",
  },
  {
    number: "03",
    eyebrow: "Fast",
    title: "Performance is part of the design.",
    description:
      "Lean architecture, measurable budgets, and careful testing keep the experience immediate.",
    visual: "performance",
  },
] as const;

const services = [
  {
    number: "01",
    title: "Strategy & direction",
    description:
      "Positioning, audience clarity, content structure, and the creative idea that holds it all together.",
  },
  {
    number: "02",
    title: "Design systems",
    description:
      "A coherent visual language built to stay expressive, consistent, and easy to evolve.",
  },
  {
    number: "03",
    title: "Next.js development",
    description:
      "Responsive, accessible implementation with a deliberately small browser footprint.",
  },
  {
    number: "04",
    title: "Launch assurance",
    description:
      "Security, accessibility, performance, and resilience verified before the website meets the world.",
  },
] as const;

export default function MarketingHomePage() {
  return (
    <div className={styles["sw-home-root-a1f6q9"]}>
      <section
        aria-labelledby="shapewebs-home-title"
        className={styles["sw-home-hero-b2g7r1"]}
      >
        <div aria-hidden="true" className={styles["sw-home-glow-c3h8s2"]} />
        <div className={styles["sw-home-grid-d4j9t3"]}>
          <div className={styles["sw-home-copy-e5k1v4"]}>
            <p className={styles["sw-home-kicker-f6m2w5"]}>
              <span className={styles["sw-home-signal-g7n3x6"]} />
              Independent digital studio · Copenhagen
            </p>
            <h1
              className={styles["sw-home-title-h8p4y7"]}
              id="shapewebs-home-title"
            >
              Websites that
              <span> feel alive.</span>
            </h1>
            <p className={styles["sw-home-lede-j9q5z8"]}>
              Shapewebs combines sharp strategy, expressive design, and
              performance-minded engineering to make digital experiences people
              remember.
            </p>
            <div className={styles["sw-home-actions-k1r6a9"]}>
              <Link
                className={styles["sw-home-primary-m2s7b1"]}
                href="/contact"
                prefetch={false}
              >
                Start a project
                <span aria-hidden="true">↗</span>
              </Link>
              <Link
                className={styles["sw-home-secondary-n3t8c2"]}
                href="/work"
                prefetch={false}
              >
                Explore the work
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          <div
            aria-label="Shapewebs quality targets: deliberate design, accessible implementation, and verified performance."
            className={styles["sw-home-stage-p4v9d3"]}
          >
            <div className={styles["sw-home-window-q5w1e4"]}>
              <div className={styles["sw-home-toolbar-r6x2f5"]}>
                <span className={styles["sw-home-dots-s7y3g6"]}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className={styles["sw-home-address-t8z4h7"]}>
                  shapewebs.com
                </span>
                <span className={styles["sw-home-live-v9a5j8"]}>Live</span>
              </div>
              <div className={styles["sw-home-canvas-w1b6k9"]}>
                <div
                  aria-hidden="true"
                  className={styles["sw-home-orbit-x2c7m1"]}
                >
                  <span />
                  <span />
                  <span />
                </div>
                <div className={styles["sw-home-panel-y3d8n2"]}>
                  <p>Launch standard</p>
                  <strong>Beauty, proven.</strong>
                  <div className={styles["sw-home-score-z4e9p3"]}>
                    <span>
                      <b>95+</b>
                      Performance
                    </span>
                    <span>
                      <b>100</b>
                      Accessibility
                    </span>
                    <span>
                      <b>A</b>
                      Security
                    </span>
                  </div>
                </div>
                <div className={styles["sw-home-note-a5f1q4"]}>
                  <span aria-hidden="true">✦</span>
                  Built to be felt. Tested to be trusted.
                </div>
              </div>
            </div>
            <p className={styles["sw-home-caption-b6g2r5"]}>
              Design and engineering, treated as one craft.
            </p>
          </div>
        </div>
      </section>

      <aside
        aria-label="Shapewebs disciplines"
        className={styles["sw-home-rail-c7h3s6"]}
      >
        <div className={styles["sw-home-railinner-d8j4t7"]}>
          {studioDisciplines.map((discipline, index) => (
            <span key={discipline}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              {discipline}
            </span>
          ))}
        </div>
      </aside>

      <section
        aria-labelledby="shapewebs-belief-title"
        className={styles["sw-home-belief-e9k5v8"]}
      >
        <div className={styles["sw-home-sectionhead-f1m6w9"]}>
          <p className={styles["sw-home-label-g2n7x1"]}>The belief</p>
          <div className={styles["sw-home-headinggroup-h3p8y2"]}>
            <h2 id="shapewebs-belief-title">
              The web has enough websites that simply{" "}
              <span>look like websites.</span>
            </h2>
            <p>
              Shapewebs exists to make something more considered: a focused
              digital experience with character, clarity, and technical depth.
            </p>
          </div>
        </div>

        <div className={styles["sw-home-principles-j4q9z3"]}>
          {principles.map((principle) => (
            <article
              className={styles["sw-home-principle-k5r1a4"]}
              key={principle.number}
            >
              <div className={styles["sw-home-cardtop-m6s2b5"]}>
                <span>{principle.number}</span>
                <p>{principle.eyebrow}</p>
              </div>

              {principle.visual === "identity" ? (
                <div
                  aria-hidden="true"
                  className={styles["sw-home-identity-n7t3c6"]}
                >
                  <span>S</span>
                  <span>W</span>
                  <span>✦</span>
                </div>
              ) : null}

              {principle.visual === "journey" ? (
                <div
                  aria-hidden="true"
                  className={styles["sw-home-journey-p8v4d7"]}
                >
                  <span>Discover</span>
                  <i />
                  <span>Understand</span>
                  <i />
                  <span>Act</span>
                </div>
              ) : null}

              {principle.visual === "performance" ? (
                <div
                  aria-hidden="true"
                  className={styles["sw-home-metric-q9w5e8"]}
                >
                  <div>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>Fast by default</strong>
                </div>
              ) : null}

              <div className={styles["sw-home-cardcopy-r1x6f9"]}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="shapewebs-services-title"
        className={styles["sw-home-services-s2y7g1"]}
      >
        <div className={styles["sw-home-serviceintro-t3z8h2"]}>
          <p className={styles["sw-home-label-g2n7x1"]}>What I do</p>
          <h2 id="shapewebs-services-title">
            From the first question to a launch that holds up.
          </h2>
        </div>
        <ol className={styles["sw-home-servicelist-v4a9j3"]}>
          {services.map((service) => (
            <li
              className={styles["sw-home-service-w5b1k4"]}
              key={service.number}
            >
              <span>{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="shapewebs-standard-title"
        className={styles["sw-home-standard-x6c2m5"]}
      >
        <div className={styles["sw-home-standardgrid-y7d3n6"]}>
          <div className={styles["sw-home-standardcopy-z8e4p7"]}>
            <p className={styles["sw-home-label-g2n7x1"]}>
              The Shapewebs standard
            </p>
            <h2 id="shapewebs-standard-title">
              Fast is a feeling.
              <br />
              <span>Trust is the result.</span>
            </h2>
            <p>
              Performance, security, accessibility, and resilience are designed
              in from day one—then measured before every release.
            </p>
          </div>
          <dl className={styles["sw-home-standards-a9f5q8"]}>
            <div>
              <dt>Performance</dt>
              <dd>
                <strong>95+</strong>
                <span>Lighthouse target</span>
              </dd>
            </div>
            <div>
              <dt>Accessibility</dt>
              <dd>
                <strong>100</strong>
                <span>Automated target</span>
              </dd>
            </div>
            <div>
              <dt>Core Web Vitals</dt>
              <dd>
                <strong>Green</strong>
                <span>Field objective</span>
              </dd>
            </div>
            <div>
              <dt>Assurance</dt>
              <dd>
                <strong>Every</strong>
                <span>Release verified</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="shapewebs-cta-title"
        className={styles["sw-home-cta-b1g6r9"]}
      >
        <div aria-hidden="true" className={styles["sw-home-ctamark-c2h7s1"]}>
          ✦
        </div>
        <p className={styles["sw-home-label-g2n7x1"]}>Have an idea?</p>
        <h2 id="shapewebs-cta-title">Let&apos;s give it shape.</h2>
        <p>
          Tell me what you are building, what needs to change, and where you
          want the website to take you.
        </p>
        <Link
          className={styles["sw-home-ctalink-d3j8t2"]}
          href="/contact"
          prefetch={false}
        >
          Start the conversation
          <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}
