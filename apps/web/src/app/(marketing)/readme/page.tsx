import type { Metadata } from "next";
import {
  BlogPostCard,
  CaseStudyCard,
  ContactBlock,
  CtaSection,
  HeroSection,
  LegalDocumentLayout,
  ServiceFeatureGrid,
  TrustStrip,
} from "@/components/marketing";
import { buildPageMetadata } from "@/lib/metadata";
import styles from "./page.module.css";

export const metadata: Metadata = buildPageMetadata({
  title: "README",
  description: "Component showcase for the public Shapewebs website system.",
  path: "/readme",
  noIndex: true,
});

const heroProofPoints = [
  { value: "Code-first", label: "Brand pages stay intentional and reviewable in the codebase." },
  { value: "Studio-ready", label: "Components are designed for a service business, not a generic startup clone." },
  { value: "SEO-safe", label: "Metadata, canonicals, and sharing remain route-owned instead of buried in JSON." },
] as const;

const serviceFeatures = [
  {
    eyebrow: "Strategy",
    title: "Positioning-led website planning",
    body: "Turn vague offerings into a clearer message structure with stronger service framing and better page hierarchy.",
    points: ["Messaging architecture", "Audience clarity", "Conversion path planning"],
  },
  {
    eyebrow: "Design",
    title: "Interfaces that feel considered",
    body: "Build a site that looks deliberate, trustworthy, and modern without falling back to generic SaaS patterns.",
    points: ["Hero systems", "Section rhythm", "Brand refinement"],
  },
  {
    eyebrow: "Delivery",
    title: "Fast implementation with room to grow",
    body: "Launch on a stable foundation that supports future case studies, blog posts, and internal studio workflows.",
    points: ["Next.js production build", "Structured content", "Operational readiness"],
  },
] as const;

const trustItems = [
  { value: "Fast by default", caption: "Performance-minded builds with a strong technical foundation." },
  { value: "Designed to scale", caption: "Components meant to support new pages, services, and editorial content later." },
  { value: "Clearer messaging", caption: "Every section is aimed at improving trust and comprehension." },
  { value: "Studio-focused", caption: "Built around how Shapewebs actually sells and delivers work." },
] as const;

const legalSections = [
  {
    title: "What this layout is for",
    paragraphs: [
      "This component is meant for legal and policy pages that still need to look polished and readable on-brand.",
      "It gives the page a stable content frame, a quick-summary rail, and enough hierarchy to keep dense information approachable.",
    ],
  },
  {
    title: "Why it stays in code first",
    paragraphs: [
      "Legal routing, metadata, and indexability should stay tightly controlled so the public site stays SEO-safe and predictable.",
      "If legal content becomes more dynamic later, this layout can still be reused while the content source evolves carefully.",
    ],
  },
] as const;

export default function ReadmePage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>Public components</p>
        <h1 className={styles.title}>README component showcase for Step 2</h1>
        <p className={styles.body}>
          These are the first public site components built as reusable compositions for the
          Shapewebs marketing system. They live on this page first so we can shape the library
          cleanly before refitting existing surfaces like the header, footer, and live route
          layouts.
        </p>
      </header>

      <div className={styles.group}>
        <HeroSection
          eyebrow="Hero section"
          title="Beautiful, fast websites built with intention."
          body="A reusable hero that gives Shapewebs a strong opening statement, two clear actions, and proof points without collapsing into a generic startup template."
          primaryAction={{ href: "/contact", label: "Start a project" }}
          secondaryAction={{ href: "/projects", label: "View case studies" }}
          proofPoints={[...heroProofPoints]}
        />
      </div>

      <div className={styles.group}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Service components</p>
          <h2 className={styles.sectionTitle}>Feature sections, proof, and conversion blocks</h2>
          <p className={styles.sectionBody}>
            This group is meant to power services pages, landing pages, and studio positioning
            sections without needing a page builder.
          </p>
        </div>

        <ServiceFeatureGrid
          eyebrow="Service feature grid"
          title="A flexible section for presenting what Shapewebs actually helps with"
          intro="This component is designed to explain services with more clarity and more personality than a plain card list."
          features={[...serviceFeatures]}
        />

        <TrustStrip label="Trust and proof strip" items={[...trustItems]} />

        <CtaSection
          eyebrow="CTA section"
          title="Need a website that feels more alive and more credible?"
          body="This call-to-action block is designed for the end of service pages, homepage sections, and case study flows where you want a clear next step without shouting."
          primaryAction={{ href: "/contact", label: "Book a conversation" }}
          secondaryAction={{ href: "/blog", label: "Read the thinking" }}
        />
      </div>

      <div className={styles.group}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Editorial cards</p>
          <h2 className={styles.sectionTitle}>Case study and blog card components</h2>
          <p className={styles.sectionBody}>
            These will later plug into live data, but for now they exist as reusable compositions we
            can refine in isolation.
          </p>
        </div>

        <div className={styles.cardGrid}>
          <CaseStudyCard
            category="Case study card"
            client="Nord Atelier"
            title="A more premium online presence for a design-led interiors brand"
            summary="Built to help a visual brand look more credible, present its offer more clearly, and create a better first impression with both private clients and commercial partners."
            tags={["Positioning", "Creative direction", "Website system"]}
            metrics={[
              "Clearer service framing for high-value enquiries",
              "A calmer visual rhythm across the full site journey",
              "Reusable sections for future editorial growth",
            ]}
            href="/projects"
          />

          <BlogPostCard
            category="Blog post card"
            date="April 2026"
            readingTime="6 min read"
            title="What makes a business website feel trustworthy instead of merely polished"
            summary="A reusable article card built for thoughtful editorial content, not just SEO filler. It prioritizes readability, hierarchy, and a more intentional tone."
            href="/blog"
          />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Contact and legal</p>
          <h2 className={styles.sectionTitle}>Operational components for real business pages</h2>
          <p className={styles.sectionBody}>
            These are the kinds of components that make the public site useful without turning the
            admin portal into a generic page editor.
          </p>
        </div>

        <ContactBlock
          eyebrow="Contact block"
          title="A calmer, more professional contact section"
          body="This component is designed for contact pages and end-of-page conversion sections where the visitor should understand the next step immediately."
          channels={[
            {
              label: "Project enquiries",
              detail: "Best for new website builds, redesigns, and brand-led service pages.",
              href: "/contact",
              linkLabel: "Open project enquiry",
            },
            {
              label: "General questions",
              detail: "Use this for collaboration questions, partnerships, or non-project messages.",
              href: "mailto:hello@shapewebs.com",
              linkLabel: "Email Shapewebs",
            },
          ]}
        />

        <LegalDocumentLayout
          title="Example legal page layout"
          intro="A reusable legal layout that keeps policy pages readable, structured, and visually in line with the rest of the site."
          effectiveDate="8 April 2026"
          lastUpdated="8 April 2026"
          highlights={[
            "Strong reading rhythm for long-form policy content",
            "Support for effective dates and document notes",
            "Summary rail for quick context and trust",
          ]}
          sections={[...legalSections]}
        />
      </div>
    </div>
  );
}
