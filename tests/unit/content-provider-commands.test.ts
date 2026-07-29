import { describe, expect, it } from "vitest";

import { createContentProviderCommandFingerprint } from "../../packages/database/src/content-provider-commands";

describe("content provider command fingerprints", () => {
  it("is deterministic across object key order and omitted optional values", () => {
    const first = createContentProviderCommandFingerprint({
      action: "blog_post.save",
      content: {
        body: [{ _key: "one", _type: "block" }],
        optional: undefined,
        title: "Provider assurance",
      },
      targetId: "blog-post-test",
    });
    const second = createContentProviderCommandFingerprint({
      targetId: "blog-post-test",
      content: {
        title: "Provider assurance",
        body: [{ _type: "block", _key: "one" }],
      },
      action: "blog_post.save",
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("distinguishes meaningful values and array order", () => {
    expect(
      createContentProviderCommandFingerprint({ categories: ["a", "b"] }),
    ).not.toBe(
      createContentProviderCommandFingerprint({ categories: ["b", "a"] }),
    );
    expect(
      createContentProviderCommandFingerprint({ title: "First" }),
    ).not.toBe(createContentProviderCommandFingerprint({ title: "Second" }));
  });

  it("rejects non-JSON values instead of producing an unstable key", () => {
    expect(() =>
      createContentProviderCommandFingerprint({ value: Number.NaN }),
    ).toThrow();
    expect(() =>
      createContentProviderCommandFingerprint({ value: () => undefined }),
    ).toThrow();
  });
});
