import Image from "next/image";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";
import {
  portableTextCalloutSchema,
  portableTextCodeSchema,
  portableTextCtaSchema,
  portableTextImageSchema,
  portableTextLinkMarkSchema,
  type SanityBlogPost,
} from "@shapewebs/content-schema";
import type { SanityImagePresentation } from "@shapewebs/content-platform/server";
import styles from "./sanity-blog-post.module.css";

type SanityBlogPostViewProps = {
  post: SanityBlogPost;
  resolveImage: (reference: string) => SanityImagePresentation;
};

function getSafeLinkHref(value: unknown): string | null {
  const parsed = portableTextLinkMarkSchema.safeParse(value);
  return parsed.success ? parsed.data.href : null;
}

export function SanityBlogPostView({
  post,
  resolveImage,
}: SanityBlogPostViewProps) {
  const cover = resolveImage(post.coverImage.asset._ref);
  const components: PortableTextComponents = {
    block: {
      blockquote: ({ children }) => (
        <blockquote className={styles["sw-article-quote-r8q2m4"]}>
          {children}
        </blockquote>
      ),
      h2: ({ children }) => <h2>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
      h4: ({ children }) => <h4>{children}</h4>,
      normal: ({ children }) => <p>{children}</p>,
    },
    marks: {
      code: ({ children }) => <code>{children}</code>,
      link: ({ children, value }) => {
        const href = getSafeLinkHref(value);

        if (!href) {
          return <>{children}</>;
        }

        return href.startsWith("/") ? (
          <Link href={href}>{children}</Link>
        ) : (
          <a href={href} rel="noreferrer">
            {children}
          </a>
        );
      },
    },
    types: {
      callout: ({ value }) => {
        const parsed = portableTextCalloutSchema.safeParse(value);

        return parsed.success ? (
          <aside className={styles["sw-article-callout-v2m8q6"]}>
            {parsed.data.heading ? (
              <strong>{parsed.data.heading}</strong>
            ) : null}
            <p>{parsed.data.body}</p>
          </aside>
        ) : null;
      },
      codeBlock: ({ value }) => {
        const parsed = portableTextCodeSchema.safeParse(value);

        return parsed.success ? (
          <figure className={styles["sw-article-code-c2m8p4"]}>
            {parsed.data.filename ? (
              <figcaption>{parsed.data.filename}</figcaption>
            ) : null}
            <pre>
              <code>{parsed.data.code}</code>
            </pre>
          </figure>
        ) : null;
      },
      cta: ({ value }) => {
        const parsed = portableTextCtaSchema.safeParse(value);

        if (!parsed.success) {
          return null;
        }

        const content = (
          <>
            {parsed.data.heading ? (
              <strong>{parsed.data.heading}</strong>
            ) : null}
            <span>{parsed.data.label}</span>
          </>
        );

        return parsed.data.href.startsWith("/") ? (
          <Link
            className={styles["sw-article-cta-x6p1m9"]}
            href={parsed.data.href}
          >
            {content}
          </Link>
        ) : (
          <a
            className={styles["sw-article-cta-x6p1m9"]}
            href={parsed.data.href}
            rel="noreferrer"
          >
            {content}
          </a>
        );
      },
      image: ({ value }) => {
        const parsed = portableTextImageSchema.safeParse(value);

        if (!parsed.success) {
          return null;
        }

        const image = resolveImage(parsed.data.asset._ref);

        return (
          <figure
            className={
              styles[
                parsed.data.layout === "contained"
                  ? "sw-article-image-q5n9p2"
                  : "sw-article-imagewide-f4q1m8"
              ]
            }
          >
            <Image
              alt={parsed.data.decorative ? "" : parsed.data.alt}
              height={image.height}
              src={image.url}
              width={image.width}
            />
            {parsed.data.caption ? (
              <figcaption>{parsed.data.caption}</figcaption>
            ) : null}
          </figure>
        );
      },
    },
  };

  return (
    <article className={styles["sw-article-root-p4m8q2"]}>
      <header className={styles["sw-article-header-b7m2p5"]}>
        <p className={styles["sw-article-eyebrow-d8m3q1"]}>Shapewebs journal</p>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
      </header>

      <figure className={styles["sw-article-cover-n4v8q1"]}>
        <Image
          alt={post.coverImage.decorative ? "" : post.coverImage.alt}
          height={cover.height}
          priority
          sizes="(max-width: 900px) 100vw, 900px"
          src={cover.url}
          width={cover.width}
        />
        {post.coverImage.caption ? (
          <figcaption>{post.coverImage.caption}</figcaption>
        ) : null}
      </figure>

      <div className={styles["sw-article-body-a7q3m6"]}>
        <PortableText components={components} value={post.body} />
      </div>
    </article>
  );
}
