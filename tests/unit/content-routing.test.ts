import { describe, expect, it } from "vitest";
import {
  contentRouteMatchesDocument,
  resolveContentRoute,
} from "../../apps/web/src/lib/content-routing";

describe("public content routing", () => {
  it("resolves a localized collection route", () => {
    expect(resolveContentRoute(["da-DK", "blog", "sikker-platform"])).toEqual({
      contentType: "post",
      kind: "typed",
      localeCode: "da-DK",
      slug: "sikker-platform",
    });
  });

  it("resolves the localized root to the locale homepage", () => {
    expect(resolveContentRoute(["da-DK"])).toEqual({
      kind: "generic",
      localeCode: "da-DK",
      slug: "home",
    });
  });

  it("keeps the default locale prefixless", () => {
    expect(resolveContentRoute(["studio"])).toEqual({
      kind: "generic",
      localeCode: "en",
      slug: "studio",
    });
  });

  it("rejects ambiguous and unsupported nested routes", () => {
    expect(resolveContentRoute(["da-DK", "unknown", "page"])).toBeNull();
    expect(resolveContentRoute(["da-DK", "blog", "post", "extra"])).toBeNull();
  });

  it("binds a private preview to its exact locale, type, and slug", () => {
    const route = resolveContentRoute(["da-DK", "blog", "sikker-platform"]);

    expect(route).not.toBeNull();

    if (!route) {
      throw new Error("Expected the preview route to resolve.");
    }

    expect(
      contentRouteMatchesDocument(route, {
        contentType: "post",
        localeCode: "da-DK",
        pageKind: null,
        slug: "sikker-platform",
      }),
    ).toBe(true);

    for (const document of [
      {
        contentType: "post" as const,
        localeCode: "en",
        pageKind: null,
        slug: "sikker-platform",
      },
      {
        contentType: "project" as const,
        localeCode: "da-DK",
        pageKind: null,
        slug: "sikker-platform",
      },
      {
        contentType: "post" as const,
        localeCode: "da-DK",
        pageKind: null,
        slug: "another-post",
      },
    ]) {
      expect(contentRouteMatchesDocument(route, document)).toBe(false);
    }
  });

  it("matches only page home revisions to localized preview roots", () => {
    const route = resolveContentRoute(["da-DK"]);

    expect(route).not.toBeNull();

    if (!route) {
      throw new Error("Expected the localized preview root to resolve.");
    }

    expect(
      contentRouteMatchesDocument(route, {
        contentType: "page",
        localeCode: "da-DK",
        pageKind: "home",
        slug: "forside",
      }),
    ).toBe(true);
    expect(
      contentRouteMatchesDocument(route, {
        contentType: "method",
        localeCode: "da-DK",
        pageKind: null,
        slug: "home",
      }),
    ).toBe(false);
  });
});
