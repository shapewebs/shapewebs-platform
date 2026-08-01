import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Authentication,
  Buttons,
  Brand,
  Feedback,
  Forms,
  Navigation,
  Pickers,
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
        "Book a call",
      ),
    );
    const brandButton = renderToStaticMarkup(
      createElement(Buttons.Button, { kind: "brand" }, "Continue"),
    );

    expect(button).toContain('data-component-status="styled"');
    expect(button).toContain('aria-busy="true"');
    expect(button).toContain("disabled");
    expect(anchor).toContain('href="mailto:info@shapewebs.com"');
    expect(anchor).toContain('data-component-status="styled"');
    expect(brandButton).toContain("button-brand-");
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

  it("can embed one visual spinner inside an existing live region", () => {
    const spinner = renderToStaticMarkup(
      createElement(Feedback.Spinner, {
        announce: false,
        size: "sm",
      }),
    );

    expect(spinner).toContain('aria-hidden="true"');
    expect(spinner).not.toContain('role="status"');
    expect(spinner).not.toContain("Loading");
  });

  it("renders native form controls through one styled state contract", () => {
    const input = renderToStaticMarkup(
      createElement(Forms.Input, {
        "aria-label": "Work email",
        controlSize: "large",
        invalid: true,
        name: "email",
        type: "email",
      }),
    );
    const textArea = renderToStaticMarkup(
      createElement(Forms.TextArea, {
        "aria-label": "Project context",
        readOnly: true,
      }),
    );
    const select = renderToStaticMarkup(
      createElement(
        Pickers.Select,
        { "aria-label": "Project type", defaultValue: "site" },
        createElement("option", { value: "site" }, "Website"),
      ),
    );

    expect(input).toContain('type="email"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain("control-large-");
    expect(textArea).toContain("<textarea");
    expect(textArea).toContain('readOnly=""');
    expect(textArea).toContain("control-multiline-");
    expect(select).toContain("<select");
    expect(select).toContain("<option");
    expect(select).toContain("control-select-");
  });

  it("associates password labels, descriptions, and a keyboard button", () => {
    const password = renderToStaticMarkup(
      createElement(Forms.PasswordField, {
        autoComplete: "current-password",
        description: "Use your Shapewebs password.",
        id: "account-password",
        label: "Password",
        name: "password",
      }),
    );

    expect(password).toContain('for="account-password"');
    expect(password).toContain('id="account-password"');
    expect(password).toContain('type="password"');
    expect(password).toContain('autoComplete="current-password"');
    expect(password).toContain('aria-label="Show password"');
    expect(password).toContain('aria-pressed="false"');
    expect(password).toContain('type="button"');
  });

  it("keeps passkey states presentational until WebAuthn is approved", () => {
    const unavailable = renderToStaticMarkup(
      createElement(Authentication.PasskeyFrame, {
        status: "unavailable",
      }),
    );
    const waiting = renderToStaticMarkup(
      createElement(Authentication.PasskeyFrame, { status: "waiting" }),
    );

    expect(unavailable).toContain('data-passkey-status="unavailable"');
    expect(unavailable).toContain("Passkeys are coming later");
    expect(unavailable).not.toContain("<button");
    expect(unavailable).not.toContain("<form");
    expect(waiting).toContain('data-passkey-status="waiting"');
    expect(waiting).toContain("Waiting for a passkey");
    expect(waiting).toContain('data-slot="spinner"');

    for (const status of ["cancelled", "error", "unsupported"] as const) {
      const state = renderToStaticMarkup(
        createElement(Authentication.PasskeyFrame, { status }),
      );

      expect(state).toContain(`data-passkey-status="${status}"`);
      expect(state).not.toContain("<button");
      expect(state).not.toContain("<form");
    }
  });

  it("renders internal links without opting into prefetching", () => {
    const link = renderToStaticMarkup(
      createElement(Navigation.Link, { href: "/dashboard" }, "Dashboard"),
    );

    expect(link).toContain('href="/dashboard"');
    expect(link).toContain('data-component-status="styled"');
    expect(link).not.toContain("data-prefetch");
  });

  it("renders reusable submenu triggers and internal actions closed by default", () => {
    const navigation = renderToStaticMarkup(
      createElement(Navigation.SubmenuNavigation, {
        ariaLabel: "Primary navigation",
        items: [
          {
            id: "services",
            kind: "submenu" as const,
            label: "Services",
            sections: [
              {
                label: "Design",
                links: [{ href: "/services/design", label: "Website design" }],
              },
            ],
          },
          {
            id: "search",
            kind: "slot" as const,
          },
          {
            id: "account",
            kind: "separator" as const,
          },
          {
            href: "/start-a-project",
            kind: "link" as const,
            label: "Book a call",
            presentation: "action" as const,
          },
        ],
        slots: { search: "Search" },
      }),
    );

    expect(navigation).toContain('aria-label="Primary navigation"');
    expect(navigation).toContain('aria-expanded="false"');
    expect(navigation).toContain('href="/start-a-project"');
    expect(navigation).toContain('data-component-status="styled"');
    expect(navigation).toContain("button-primary-");
    expect(navigation).toContain("Search");
    expect(navigation).toContain("subnav-slot-");
    expect(navigation).toContain("subnav-divider-");
    expect(navigation).toContain("button-small-");
    expect(navigation).not.toContain("subnav-action-");
  });

  it("records each promoted foundation primitive as styled", () => {
    expect(componentRegistry.brand.ShapewebsBrand).toBe("styled");
    expect(componentRegistry.buttons).toMatchObject({
      Button: "styled",
      ButtonAnchor: "styled",
      ButtonControl: "styled",
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
    expect(componentRegistry.authentication).toMatchObject({
      AuthLayout: "styled",
      AuthLinks: "styled",
      AuthMessage: "styled",
      AuthPending: "styled",
      AuthStageHeader: "styled",
      AuthStageTransition: "styled",
      PasskeyFrame: "styled",
    });
    expect(componentRegistry.forms).toMatchObject({
      Field: "styled",
      Input: "styled",
      InputOtp: "styled",
      NumberField: "styled",
      PasswordField: "styled",
      SearchField: "styled",
      TextArea: "styled",
      TextField: "styled",
    });
    expect(componentRegistry.pickers.Select).toBe("styled");
    expect(componentRegistry.navigation.Link).toBe("styled");
    expect(componentRegistry.navigation.SubmenuNavigation).toBe("styled");
  });

  it("renders the scalable Shapewebs brand mark without an image request", () => {
    const brand = renderToStaticMarkup(
      createElement(Brand.ShapewebsBrand, null),
    );

    expect(brand).toContain("Shapewebs");
    expect(brand).toContain("data-component-status");
    expect(brand).toContain('viewBox="0 5.625 180 169.087"');
    expect(brand).toContain("brand-mark-");
    expect(brand).not.toContain("<img");
  });
});
