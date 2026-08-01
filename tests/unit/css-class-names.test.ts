import { describe, expect, it, vi } from "vitest";

import {
  createCssClassId,
  parseCssClassName,
} from "../../tooling/lib/css-class-names.mjs";

describe("CSS class-name tooling", () => {
  it("maps the full unbiased integer range to fixed-width base36 IDs", () => {
    const lowest = vi.fn(() => 0);
    const highest = vi.fn(() => 36 ** 6 - 1);

    expect(createCssClassId(lowest)).toBe("000000");
    expect(createCssClassId(highest)).toBe("zzzzzz");
    expect(lowest).toHaveBeenCalledWith(36 ** 6);
    expect(highest).toHaveBeenCalledWith(36 ** 6);
  });

  it("creates IDs accepted by the canonical class parser", () => {
    const id = createCssClassId();

    expect(parseCssClassName(`button-primary-${id}`)).toMatchObject({ id });
  });
});
