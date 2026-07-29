import { describe, expect, it } from "vitest";

import {
  portableTextContentSchema,
  sanityBlogPostSchema,
  sanityImageSchema,
} from "../../packages/content-schema/src/index";
import {
  hasAnySanityEnvironmentValue,
  readSanityDraftEnvironment,
  readSanityPublishedEnvironment,
  readSanityWebhookEnvironment,
  readSanityWriteEnvironment,
  sanityApiVersion,
} from "../../packages/content-platform/src/environment";

const validBaseEnvironment = {
  SANITY_DATASET: "staging",
  SANITY_PROJECT_ID: "abc12345",
};
const strongToken = "s".repeat(64);
const strongWebhookSecret = "w".repeat(48);
const validImage = {
  _type: "image",
  alt: "A Shapewebs project shown on a laptop",
  asset: {
    _ref: `image-${"a".repeat(40)}-1600x900-webp`,
    _type: "reference",
  },
  decorative: false,
};
const validPortableText = [
  {
    _key: "paragraph1",
    _type: "block",
    children: [
      {
        _key: "span1",
        _type: "span",
        marks: ["strong", "link1"],
        text: "A carefully built website",
      },
    ],
    markDefs: [
      {
        _key: "link1",
        _type: "link",
        href: "/contact",
      },
    ],
    style: "normal",
  },
];

describe("Sanity content environment", () => {
  it("parses each least-privilege environment separately", () => {
    expect(readSanityPublishedEnvironment(validBaseEnvironment)).toEqual({
      apiVersion: sanityApiVersion,
      dataset: "staging",
      projectId: "abc12345",
    });
    expect(
      readSanityDraftEnvironment({
        ...validBaseEnvironment,
        SANITY_API_READ_TOKEN: strongToken,
      }).readToken,
    ).toBe(strongToken);
    expect(
      readSanityWriteEnvironment({
        ...validBaseEnvironment,
        SANITY_API_WRITE_TOKEN: strongToken,
      }).writeToken,
    ).toBe(strongToken);
    expect(
      readSanityWebhookEnvironment({
        ...validBaseEnvironment,
        SANITY_WEBHOOK_SECRET: strongWebhookSecret,
      }).webhookSecret,
    ).toBe(strongWebhookSecret);
  });

  it("rejects partial, malformed, or whitespace-bearing credentials", () => {
    for (const source of [
      {},
      { SANITY_DATASET: "staging" },
      { ...validBaseEnvironment, SANITY_PROJECT_ID: "UPPERCASE" },
      { ...validBaseEnvironment, SANITY_DATASET: "../production" },
    ]) {
      expect(() => readSanityPublishedEnvironment(source)).toThrow();
    }

    expect(() =>
      readSanityDraftEnvironment({
        ...validBaseEnvironment,
        SANITY_API_READ_TOKEN: `unsafe ${strongToken}`,
      }),
    ).toThrow();
    expect(() =>
      readSanityWriteEnvironment({
        ...validBaseEnvironment,
        SANITY_API_WRITE_TOKEN: "short",
      }),
    ).toThrow();
    expect(() =>
      readSanityWebhookEnvironment({
        ...validBaseEnvironment,
        SANITY_WEBHOOK_SECRET: "short",
      }),
    ).toThrow();
  });

  it("detects provider intent without considering empty values configured", () => {
    expect(hasAnySanityEnvironmentValue({})).toBe(false);
    expect(
      hasAnySanityEnvironmentValue({
        SANITY_PROJECT_ID: "",
      }),
    ).toBe(false);
    expect(hasAnySanityEnvironmentValue(validBaseEnvironment)).toBe(true);
  });
});

describe("Sanity website content contract", () => {
  it("accepts bounded Portable Text with resolvable marks", () => {
    expect(portableTextContentSchema.safeParse(validPortableText).success).toBe(
      true,
    );
  });

  it("rejects unsafe links, duplicate block keys, and unresolved marks", () => {
    const duplicateBlock = {
      ...validPortableText[0],
    };

    expect(
      portableTextContentSchema.safeParse([
        validPortableText[0],
        duplicateBlock,
      ]).success,
    ).toBe(false);
    expect(
      portableTextContentSchema.safeParse([
        {
          ...validPortableText[0],
          children: [
            {
              ...validPortableText[0].children[0],
              marks: ["unknown-mark"],
            },
          ],
        },
      ]).success,
    ).toBe(false);
    expect(
      portableTextContentSchema.safeParse([
        {
          ...validPortableText[0],
          markDefs: [
            {
              _key: "link1",
              _type: "link",
              href: "javascript:alert(1)",
            },
          ],
        },
      ]).success,
    ).toBe(false);
  });

  it("requires accessible images unless explicitly decorative", () => {
    expect(sanityImageSchema.safeParse(validImage).success).toBe(true);
    expect(
      sanityImageSchema.safeParse({
        ...validImage,
        alt: "",
      }).success,
    ).toBe(false);
    expect(
      sanityImageSchema.safeParse({
        ...validImage,
        alt: "",
        decorative: true,
      }).success,
    ).toBe(true);
  });

  it("accepts a complete bounded blog document and rejects arbitrary fields", () => {
    const blogPost = {
      _createdAt: "2026-07-29T10:00:00.000Z",
      _id: "blog-post-foundation",
      _rev: "revision1",
      _type: "blogPost",
      _updatedAt: "2026-07-29T10:01:00.000Z",
      author: {
        _ref: "author-lukas-thomsen",
        _type: "reference",
      },
      body: validPortableText,
      categories: [],
      coverImage: validImage,
      excerpt: "How Shapewebs builds secure, fast website foundations.",
      locale: "en",
      seo: {
        noIndex: false,
      },
      slug: {
        _type: "slug",
        current: "secure-fast-foundations",
      },
      title: "Secure and fast website foundations",
    };

    expect(sanityBlogPostSchema.safeParse(blogPost).success).toBe(true);
    expect(
      sanityBlogPostSchema.safeParse({
        ...blogPost,
        arbitraryHtml: "<script>alert(1)</script>",
      }).success,
    ).toBe(false);
  });
});
