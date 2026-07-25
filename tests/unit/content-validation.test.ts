import { describe, expect, it } from "vitest";

import {
  contentDocumentSchema,
  isSafeInternalHref,
} from "../../packages/content-schema/src/index";
import {
  contentDocumentListItemSchema,
  pageEditorInputSchema,
} from "../../packages/validation/src/index";

describe("content security validation", () => {
  it("accepts only normalized internal CMS links", () => {
    for (const href of ["/", "/contact", "/contact?from=cms#form"]) {
      expect(isSafeInternalHref(href)).toBe(true);
    }

    for (const href of [
      "javascript:alert(1)",
      "https://example.com",
      "//example.com",
      "/\\example.com",
      "/content/../admin",
      "/contact with spaces",
    ]) {
      expect(isSafeInternalHref(href)).toBe(false);
    }
  });

  it("rejects unsafe or incomplete CTA blocks", () => {
    const baseDocument = {
      blocks: [
        {
          heading: "Work with Shapewebs",
          href: "/contact",
          label: "Start a project",
          type: "cta",
        },
      ],
      schemaVersion: 1,
    };

    expect(contentDocumentSchema.safeParse(baseDocument).success).toBe(true);
    expect(
      contentDocumentSchema.safeParse({
        ...baseDocument,
        blocks: [
          {
            ...baseDocument.blocks[0],
            href: "javascript:alert(1)",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      contentDocumentSchema.safeParse({
        blocks: [
          {
            heading: "Build carefully",
            primaryCtaLabel: "Missing destination",
            type: "hero",
          },
        ],
        schemaVersion: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects unknown CMS document and block fields", () => {
    expect(
      contentDocumentSchema.safeParse({
        blocks: [],
        schemaVersion: 1,
        unexpected: "must not be silently accepted",
      }).success,
    ).toBe(false);

    expect(
      contentDocumentSchema.safeParse({
        blocks: [
          {
            heading: "Strict content",
            type: "hero",
            unexpected: true,
          },
        ],
        schemaVersion: 1,
      }).success,
    ).toBe(false);
  });

  it("requires HTTPS canonical overrides without credentials", () => {
    const basePage = {
      commandId: "10000000-0000-4000-8000-000000000099",
      contentJson: '{"schemaVersion":1,"blocks":[]}',
      expectedVersion: 0,
      intent: "draft",
      localeCode: "en",
      pageKind: "standard",
      robotsIndex: true,
      slug: "secure-page",
      title: "Secure page",
    };

    expect(
      pageEditorInputSchema.safeParse({
        ...basePage,
        canonicalUrlOverride: "https://shapewebs.com/secure-page",
      }).success,
    ).toBe(true);

    for (const canonicalUrlOverride of [
      "http://shapewebs.com/secure-page",
      "javascript:alert(1)",
      "https://user:password@shapewebs.com/secure-page",
    ]) {
      expect(
        pageEditorInputSchema.safeParse({
          ...basePage,
          canonicalUrlOverride,
        }).success,
      ).toBe(false);
    }
  });

  it("bounds CMS commands, editor versions, and serialized content", () => {
    const basePage = {
      commandId: "10000000-0000-4000-8000-000000000099",
      contentJson: '{"schemaVersion":1,"blocks":[]}',
      expectedVersion: 3,
      intent: "review",
      localeCode: "en",
      pageKind: "standard",
      robotsIndex: true,
      slug: "bounded-page",
      title: "Bounded page",
    };

    expect(pageEditorInputSchema.safeParse(basePage).success).toBe(true);

    for (const unsafePage of [
      { ...basePage, commandId: "not-a-command" },
      { ...basePage, expectedVersion: -1 },
      { ...basePage, expectedVersion: 1.5 },
      { ...basePage, pageKind: "Bad Page Kind" },
      { ...basePage, contentJson: "x".repeat(65_537) },
      { ...basePage, intent: "preview" },
    ]) {
      expect(pageEditorInputSchema.safeParse(unsafePage).success).toBe(false);
    }
  });

  it("accepts only bounded CMS list DTOs from the database boundary", () => {
    const listItem = {
      contentType: "method",
      documentId: "10000000-0000-4000-8000-000000000004",
      localeCode: "da-DK",
      pageKind: null,
      publishedAt: null,
      slug: "secure-delivery-method",
      state: "review",
      summary: "A reviewed, localized method.",
      title: "Secure delivery",
      updatedAt: "2026-07-24T00:00:00.000Z",
    };

    expect(contentDocumentListItemSchema.parse(listItem)).toEqual(listItem);

    for (const unsafeItem of [
      { ...listItem, localeCode: "unknown" },
      { ...listItem, slug: "<script>alert(1)</script>" },
      { ...listItem, title: "x".repeat(141) },
      { ...listItem, updatedAt: "not-a-timestamp" },
    ]) {
      expect(contentDocumentListItemSchema.safeParse(unsafeItem).success).toBe(
        false,
      );
    }
  });
});
