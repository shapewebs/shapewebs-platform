import { describe, expect, it } from "vitest";
import { resolveContentRoute } from "../../apps/web/src/lib/content-routing";

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
});
