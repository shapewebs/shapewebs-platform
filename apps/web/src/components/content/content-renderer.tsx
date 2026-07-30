import type { ContentBlock, ContentDocument } from "@shapewebs/content-schema";
import { Buttons, Layout } from "@shapewebs/ui";

import styles from "./content-renderer.module.css";

type ContentRendererProps = {
  document: ContentDocument;
};

function renderInlineNode(node: unknown, key: string): React.ReactNode {
  if (typeof node !== "object" || node === null) {
    return null;
  }

  const text = Reflect.get(node, "text");
  if (typeof text === "string") {
    return <span key={key}>{text}</span>;
  }

  const content = Reflect.get(node, "content");
  if (Array.isArray(content)) {
    return content.map((child, index) =>
      renderInlineNode(child, `${key}-${index}`),
    );
  }

  return null;
}

function renderRichTextBlock(
  block: Extract<ContentBlock, { type: "rich_text" }>,
) {
  return block.document.map((node, index) => {
    if (node.type === "paragraph") {
      return (
        <p
          key={`paragraph-${index}`}
          className={styles["sw-renderer-paragraph-f9s5w7"]}
        >
          {Array.isArray(node.content)
            ? node.content.map((child, childIndex) =>
                renderInlineNode(child, `paragraph-${index}-${childIndex}`),
              )
            : null}
        </p>
      );
    }

    return null;
  });
}

export function ContentRenderer({ document }: ContentRendererProps) {
  return (
    <div className={styles["sw-renderer-root-a4m9q2"]}>
      {document.blocks.map((block, index) => {
        if (block.type === "hero") {
          return (
            <section
              className={styles["sw-renderer-hero-b5n1r3"]}
              key={`hero-${index}`}
            >
              {block.eyebrow ? (
                <p className={styles["sw-renderer-eyebrow-d7q3t5"]}>
                  {block.eyebrow}
                </p>
              ) : null}
              <h2>{block.heading}</h2>
              {block.body ? (
                <p className={styles["sw-renderer-body-e8r4v6"]}>
                  {block.body}
                </p>
              ) : null}
              {block.primaryCtaHref && block.primaryCtaLabel ? (
                <Buttons.ButtonLink
                  href={block.primaryCtaHref}
                  kind="secondary"
                >
                  {block.primaryCtaLabel}
                </Buttons.ButtonLink>
              ) : null}
            </section>
          );
        }

        if (block.type === "rich_text") {
          return (
            <section
              className={styles["sw-renderer-section-c6p2s4"]}
              key={`rich-${index}`}
            >
              {renderRichTextBlock(block)}
            </section>
          );
        }

        if (block.type === "cta") {
          return (
            <section
              className={styles["sw-renderer-section-c6p2s4"]}
              key={`cta-${index}`}
            >
              <Layout.Surface className={styles["sw-renderer-ctapanel-g1t6x8"]}>
                <h2>{block.heading}</h2>
                {block.body ? (
                  <p className={styles["sw-renderer-body-e8r4v6"]}>
                    {block.body}
                  </p>
                ) : null}
                <Buttons.ButtonLink href={block.href}>
                  {block.label}
                </Buttons.ButtonLink>
              </Layout.Surface>
            </section>
          );
        }

        if (block.type === "faq") {
          return (
            <section
              className={styles["sw-renderer-section-c6p2s4"]}
              key={`faq-${index}`}
            >
              {block.heading ? <h2>{block.heading}</h2> : null}
              <div className={styles["sw-renderer-faqlist-h2v7y9"]}>
                {block.items.map((item, itemIndex) => (
                  <Layout.Card
                    className={styles["sw-renderer-faqitem-j3w8z1"]}
                    key={`faq-item-${itemIndex}`}
                  >
                    <h3>{item.question}</h3>
                    {item.answer.map((answerNode, answerIndex) => (
                      <div key={`faq-answer-${itemIndex}-${answerIndex}`}>
                        {answerNode.type === "paragraph" &&
                        Array.isArray(answerNode.content) ? (
                          <p className={styles["sw-renderer-paragraph-f9s5w7"]}>
                            {answerNode.content.map((child, childIndex) =>
                              renderInlineNode(
                                child,
                                `faq-answer-${itemIndex}-${answerIndex}-${childIndex}`,
                              ),
                            )}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </Layout.Card>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "image") {
          return (
            <section
              className={styles["sw-renderer-section-c6p2s4"]}
              key={`image-${index}`}
            >
              <Layout.Surface
                className={styles["sw-renderer-image-k4x9a2"]}
                level="sunken"
              >
                Media pipeline pending for asset <code>{block.assetId}</code>.
              </Layout.Surface>
              {block.caption ? (
                <p className={styles["sw-renderer-caption-m5y1b3"]}>
                  {block.caption}
                </p>
              ) : null}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
