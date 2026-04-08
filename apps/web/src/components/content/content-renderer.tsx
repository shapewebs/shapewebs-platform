import Link from "next/link";
import type {
  ContentBlock,
  ContentDocument,
} from "@shapewebs/content-schema";
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
    return content.map((child, index) => renderInlineNode(child, `${key}-${index}`));
  }

  return null;
}

function renderRichTextBlock(block: Extract<ContentBlock, { type: "rich_text" }>) {
  return block.document.map((node, index) => {
    if (node.type === "paragraph") {
      return (
        <p key={`paragraph-${index}`} className={styles.paragraphB8m4q1}>
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
    <div className={styles.rootN6m2q8}>
      {document.blocks.map((block, index) => {
        if (block.type === "hero") {
          return (
            <section className={styles.heroT2m9q3} key={`hero-${index}`}>
              {block.eyebrow ? <p className={styles.eyebrowK5m1q7}>{block.eyebrow}</p> : null}
              <h2>{block.heading}</h2>
              {block.body ? <p className={styles.bodyP7m3q1}>{block.body}</p> : null}
              {block.primaryCtaHref && block.primaryCtaLabel ? (
                <Link className={styles.ctaLinkQ3m8r4} href={block.primaryCtaHref}>
                  {block.primaryCtaLabel}
                </Link>
              ) : null}
            </section>
          );
        }

        if (block.type === "rich_text") {
          return (
            <section className={styles.sectionM8q2p5} key={`rich-${index}`}>
              {renderRichTextBlock(block)}
            </section>
          );
        }

        if (block.type === "cta") {
          return (
            <section className={styles.sectionM8q2p5} key={`cta-${index}`}>
              <div className={styles.ctaPanelV9m4q2}>
                <h2>{block.heading}</h2>
                {block.body ? <p className={styles.bodyP7m3q1}>{block.body}</p> : null}
                <Link className={styles.ctaLinkQ3m8r4} href={block.href}>
                  {block.label}
                </Link>
              </div>
            </section>
          );
        }

        if (block.type === "faq") {
          return (
            <section className={styles.sectionM8q2p5} key={`faq-${index}`}>
              {block.heading ? <h2>{block.heading}</h2> : null}
              <div className={styles.faqListX5m2q7}>
                {block.items.map((item, itemIndex) => (
                  <article className={styles.faqItemH6m4q9} key={`faq-item-${itemIndex}`}>
                    <h3>{item.question}</h3>
                    {item.answer.map((answerNode, answerIndex) => (
                      <div key={`faq-answer-${itemIndex}-${answerIndex}`}>
                        {answerNode.type === "paragraph" && Array.isArray(answerNode.content) ? (
                          <p className={styles.paragraphB8m4q1}>
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
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (block.type === "image") {
          return (
            <section className={styles.sectionM8q2p5} key={`image-${index}`}>
              <div className={styles.imagePlaceholderC4m7p2}>
                Media pipeline pending for asset <code>{block.assetId}</code>.
              </div>
              {block.caption ? <p className={styles.captionR6m3q8}>{block.caption}</p> : null}
            </section>
          );
        }

        return null;
      })}
    </div>
  );
}
