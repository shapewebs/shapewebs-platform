import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Buttons,
  Brand,
  Feedback,
  Navigation,
  componentRegistry,
} from "../../packages/ui/src";

describe("visual foundation components", () => {
  it("renders actions with one shared styled contract", () => {
    const button = renderToStaticMarkup(
      createElement(Buttons.Button, { pending: true }, "Save"),
    );
    const anchor = renderToStaticMarkup(
      createElement(
        Buttons.ButtonAnchor,
        { href: "mailto:info@shapewebs.com", kind: "secondary" },
        "Start a project",
      ),
    );

    expect(button).toContain('data-component-status="styled"');
    expect(button).toContain('aria-busy="true"');
    expect(button).toContain("disabled");
    expect(anchor).toContain('href="mailto:info@shapewebs.com"');
    expect(anchor).toContain('data-component-status="styled"');
  });

  it("keeps the native toggle input and its accessible label", () => {
    const toggle = renderToStaticMarkup(
      createElement(Buttons.ToggleButton, {
        defaultChecked: true,
        label: "Publish automatically",
        name: "automatic-publishing",
      }),
    );

    expect(toggle).toContain('type="checkbox"');
    expect(toggle).toContain('data-component-status="styled"');
    expect(toggle).toContain("Publish automatically");
    expect(toggle).not.toContain('aria-hidden="true">Publish automatically');
  });

  it("exposes loading status text without depending on animation", () => {
    const spinner = renderToStaticMarkup(
      createElement(Feedback.Spinner, {
        label: "Publishing content",
      }),
    );

    expect(spinner).toContain('role="status"');
    expect(spinner).toContain("Publishing content");
    expect(spinner).toContain('data-component-status="styled"');
  });

  it("renders internal links without opting into prefetching", () => {
    const link = renderToStaticMarkup(
      createElement(Navigation.Link, { href: "/dashboard" }, "Dashboard"),
    );

    expect(link).toContain('href="/dashboard"');
    expect(link).toContain('data-component-status="styled"');
    expect(link).not.toContain("data-prefetch");
  });

  it("records each promoted foundation primitive as styled", () => {
    expect(componentRegistry.brand.ShapewebsBrand).toBe("styled");
    expect(componentRegistry.buttons).toMatchObject({
      Button: "styled",
      ButtonAnchor: "styled",
      ButtonGroup: "styled",
      ButtonLink: "styled",
      CloseButton: "styled",
      ToggleButton: "styled",
      ToggleButtonGroup: "styled",
    });
    expect(componentRegistry.layout).toMatchObject({
      Card: "styled",
      Cluster: "styled",
      Container: "styled",
      Stack: "styled",
      Surface: "styled",
    });
    expect(componentRegistry.feedback.Spinner).toBe("styled");
    expect(componentRegistry.navigation.Link).toBe("styled");
  });

  it("renders one current-color brand mark for both themes", () => {
    const brand = renderToStaticMarkup(
      createElement(Brand.ShapewebsBrand, null),
    );

    expect(brand).toContain("Shapewebs");
    expect(brand).toContain("data-component-status");
    expect(brand).not.toContain("<img");
  });
});
