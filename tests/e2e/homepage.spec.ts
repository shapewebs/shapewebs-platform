import { expect, test } from "@playwright/test";

test("homepage body is empty, themed, and free of third-party requests", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute(
    "data-sw-theme",
    "showcase",
  );
  await expect(page.locator("main")).toBeEmpty();
  await expect(page.locator("main").getByRole("heading")).toHaveCount(0);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Book a call", exact: true }),
  ).toHaveAttribute("href", "/start-a-project");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Log in", exact: true }),
  ).toHaveAttribute("href", "https://admin.shapewebs.com/login");
  await expect(page.getByText("Websites that feel alive.")).toHaveCount(0);

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    mainChildCount: document.querySelector("main")?.childElementCount,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.mainChildCount).toBe(0);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);

  const externalOrigins = await page.evaluate(() => {
    const ownOrigin = window.location.origin;

    return Array.from(
      new Set(
        performance
          .getEntriesByType("resource")
          .map((entry) => new URL(entry.name).origin)
          .filter((origin) => origin !== ownOrigin),
      ),
    );
  });

  expect(externalOrigins).toEqual([]);
});

test("navigation search and the footer theme selector preserve their state", async ({
  page,
}) => {
  await page.goto("/");

  const searchTrigger = page.getByRole("button", {
    name: "Search",
    exact: true,
  });
  const searchDialog = page.getByRole("dialog", { name: "Site search" });

  await searchTrigger.click();
  await expect(searchTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(searchDialog).toBeVisible();
  await searchDialog
    .getByRole("searchbox", { name: "Search Shapewebs" })
    .fill("journal");
  await expect(
    searchDialog.getByRole("link", { name: /Journal/ }),
  ).toBeVisible();
  await searchTrigger.press("Escape");
  await expect(searchDialog).toBeHidden();

  const themeSelector = page.getByRole("radiogroup", { name: "Color theme" });
  const lightThemeOption = themeSelector.getByRole("radio", {
    name: "Use light theme",
  });
  await lightThemeOption.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-preference",
    "light",
  );
  await expect(lightThemeOption).toHaveAttribute("aria-checked", "true");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
  await expect(
    page.getByRole("radio", { name: "Use light theme" }),
  ).toHaveAttribute("aria-checked", "true");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("radio", { name: "Use system theme" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-scheme",
    "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
});

test("desktop submenus share one morphing, keyboard-dismissible surface", async ({
  page,
}) => {
  await page.goto("/");

  const servicesTrigger = page.getByRole("button", {
    name: "Services",
    exact: true,
  });
  const studioTrigger = page.getByRole("button", {
    name: "Studio",
    exact: true,
  });
  const surface = page.locator("[data-submenu-surface]");

  await servicesTrigger.hover();
  await expect(servicesTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(surface).toHaveAttribute("data-active-menu", "services");
  await expect(surface).toHaveAttribute("data-state", "open");
  await expect(
    surface.locator('a[href="/services/website-design"]'),
  ).toBeVisible();
  await page.waitForTimeout(260);

  const servicesSize = await surface.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });
  const servicesPanelSize = await surface
    .locator('[data-layer="active"]')
    .evaluate((element) => ({
      height: (element as HTMLElement).offsetHeight,
      width: (element as HTMLElement).offsetWidth,
    }));

  expect(Math.round(servicesSize.width)).toBe(servicesPanelSize.width);
  expect(Math.round(servicesSize.height)).toBe(servicesPanelSize.height);

  await studioTrigger.hover();
  await expect(servicesTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(studioTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(surface).toHaveAttribute("data-active-menu", "studio");
  await expect(surface.locator('[data-layer="active"]')).toHaveAttribute(
    "data-direction",
    "forward",
  );
  await expect(surface.locator('a[href="/studio/about"]')).toBeVisible();
  await page.waitForTimeout(260);

  const studioSize = await surface.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, width: bounds.width };
  });

  expect(Math.round(studioSize.width)).not.toBe(Math.round(servicesSize.width));
  expect(Math.round(studioSize.height)).not.toBe(
    Math.round(servicesSize.height),
  );

  await studioTrigger.press("Escape");
  await expect(surface).toHaveAttribute("data-state", "closed");
  await expect(studioTrigger).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(240);
  await expect(surface).not.toHaveAttribute("data-active-menu");
  await expect(surface).toHaveAttribute("data-morphing", "false");
  await expect
    .poll(() =>
      surface.evaluate((element) => ({
        height: (element as HTMLElement).style.getPropertyValue(
          "--submenu-height",
        ),
        width: (element as HTMLElement).style.getPropertyValue(
          "--submenu-width",
        ),
      })),
    )
    .toEqual({ height: "", width: "" });

  await servicesTrigger.hover();
  await expect(surface).toHaveAttribute("data-state", "open");
  await expect(surface).toHaveAttribute("data-active-menu", "services");
  await expect(surface).toHaveAttribute("data-morphing", "false");
  await expect(surface.locator('[data-layer="active"]')).toHaveAttribute(
    "data-direction",
    "idle",
  );

  const reopenedSize = await surface.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      height: Number.parseFloat(styles.height),
      width: Number.parseFloat(styles.width),
    };
  });
  const reopenedPanelSize = await surface
    .locator('[data-layer="active"]')
    .evaluate((element) => ({
      height: (element as HTMLElement).offsetHeight,
      width: (element as HTMLElement).offsetWidth,
    }));

  expect(Math.round(reopenedSize.width)).toBe(reopenedPanelSize.width);
  expect(Math.round(reopenedSize.height)).toBe(reopenedPanelSize.height);

  for (const trigger of [studioTrigger, servicesTrigger, studioTrigger]) {
    await trigger.hover();
    await page.waitForTimeout(35);
  }

  await expect(surface).toHaveAttribute("data-active-menu", "studio");
  await page.waitForTimeout(240);
  await expect(surface.locator('[data-layer="active"]')).toHaveCount(1);
  await expect(surface.locator('[data-layer="previous"]')).toHaveCount(0);
});

test("mobile navigation keeps every destination and submenu accessible", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 800 });
  await page.goto("/");

  const menuTrigger = page.getByRole("button", { name: "Menu", exact: true });
  const drawer = page.locator("[data-mobile-navigation]");

  await menuTrigger.click();
  await expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toHaveAttribute("data-state", "open");

  const servicesTrigger = drawer.getByRole("button", {
    name: "Services",
    exact: true,
  });
  await servicesTrigger.click();
  await expect(servicesTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    drawer.getByRole("link", { name: "Website design", exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Log in", exact: true }),
  ).toHaveAttribute("href", "https://admin.shapewebs.com/login");
  await expect(
    drawer.getByRole("button", { name: "Search", exact: true }),
  ).toBeVisible();
  await expect(
    drawer
      .locator("[data-navigation-action]")
      .filter({ hasText: "Book a call" }),
  ).toHaveAttribute("href", "/start-a-project");

  await servicesTrigger.press("Escape");
  await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toHaveAttribute("data-state", "closed");
});

test("removed public page routes return not found", async ({ request }) => {
  for (const route of [
    "/contact",
    "/blog",
    "/blog/example",
    "/da-DK/blog",
    "/work",
    "/work/example",
    "/projects",
    "/projects/example",
    "/services/example",
    "/legal/privacy",
    "/unregistered-page",
  ]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(404);
  }
});
