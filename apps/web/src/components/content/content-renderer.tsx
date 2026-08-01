import type { ContentBlock, ContentDocument } from "@shapewebs/content-schema";
import { ButtonLink } from "@shapewebs/ui/button-link";
import { Card } from "@shapewebs/ui/card";
import { Surface } from "@shapewebs/ui/surface";

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
          className={styles["renderer-paragraph-jaiec8"]}
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
    <div className={styles["renderer-root-nztb6v"]}>
      {document.blocks.map((block, index) => {
        if (block.type === "hero") {
          return (
            <section
              className={styles["renderer-hero-jpodfg"]}
              key={`hero-${index}`}
            >
              {block.eyebrow ? (
                <p className={styles["renderer-eyebrow-z07u8c"]}>
                  {block.eyebrow}
                </p>
              ) : null}
              <h2>{block.heading}</h2>
              {block.body ? (
                <p className={styles["renderer-body-xcdqqj"]}>{block.body}</p>
              ) : null}
              {block.primaryCtaHref && block.primaryCtaLabel ? (
                <ButtonLink href={block.primaryCtaHref} kind="secondary">
                  {block.primaryCtaLabel}
                </ButtonLink>
              ) : null}
            </section>
          );
        }

        if (block.type === "rich_text") {
          return (
            <section
              className={styles["renderer-section-smy3lo"]}
              key={`rich-${index}`}
            >
              {renderRichTextBlock(block)}
            </section>
          );
        }

        if (block.type === "cta") {
          return (
            <section
              className={styles["renderer-section-smy3lo"]}
              key={`cta-${index}`}
            >
              <Surface className={styles["renderer-ctapanel-ph5l63"]}>
                <h2>{block.heading}</h2>
                {block.body ? (
                  <p className={styles["renderer-body-xcdqqj"]}>{block.body}</p>
                ) : null}
                <ButtonLink href={block.href}>{block.label}</ButtonLink>
              </Surface>
            </section>
          );
        }

        if (block.type === "faq") {
          return (
            <section
              className={styles["renderer-section-smy3lo"]}
              key={`faq-${index}`}
            >
              {block.heading ? <h2>{block.heading}</h2> : null}
              <div className={styles["renderer-faqlist-hkpmio"]}>
                {block.items.map((item, itemIndex) => (
                  <Card
                    className={styles["renderer-faqitem-vjwww2"]}
                    key={`faq-item-${itemIndex}`}
                  >
                    <h3>{item.question}</h3>
                    {item.answer.map((answerNode, answerIndex) => (
                      <div key={`faq-answer-${itemIndex}-${answerIndex}`}>
                        {answerNode.type === "paragraph" &&
                        Array.isArray(answerNode.content) ? (
                          <p className={styles["renderer-paragraph-jaiec8"]}>
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
                  </Card>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "image") {
          return (
            <section
              className={styles["renderer-section-smy3lo"]}
              key={`image-${index}`}
            >
              <Surface
                className={styles["renderer-image-xq8c66"]}
                level="sunken"
              >
                Media pipeline pending for asset <code>{block.assetId}</code>.
              </Surface>
              {block.caption ? (
                <p className={styles["renderer-caption-sr5qta"]}>
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
