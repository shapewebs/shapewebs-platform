import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const adminOrigin = "http://127.0.0.1:3101";
const configuredAdminPreviewOrigin = "http://127.0.0.1:3102";

for (const route of ["/"]) {
  test(`${route} has no automatically detectable WCAG A or AA violations`, async ({
    page,
  }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

test("the open public submenu has no detectable WCAG A or AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Services", exact: true }).click();

  await expect(page.locator("[data-submenu-surface]")).toHaveAttribute(
    "data-state",
    "open",
  );

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  expect(results.violations).toEqual([]);
});

test("the search utility in both themes has no detectable WCAG A or AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Use dark theme" }).click();
  await page.getByRole("button", { name: "Search", exact: true }).click();

  const darkResults = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();

  expect(darkResults.violations).toEqual([]);

  await page.getByRole("radio", { name: "Use light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-color-scheme",
    "light",
  );
  await page.waitForTimeout(250);

  const lightResults = await new AxeBuilder({ page })
    .withTags(wcagTags)
    .analyze();

  expect(lightResults.violations).toEqual([]);
});

test("the expanded mobile navigation has no detectable WCAG A or AA violations", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .locator("[data-mobile-navigation]")
    .getByRole("button", { name: "Services", exact: true })
    .click();

  await expect(page.locator("[data-mobile-navigation]")).toHaveAttribute(
    "data-state",
    "open",
  );

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  expect(results.violations).toEqual([]);
});

for (const route of [
  "/login",
  "/activate",
  "/forgot-password",
  "/reset-password",
]) {
  test(`admin auth route ${route} has no detectable WCAG A or AA violations`, async ({
    page,
  }) => {
    const response = await page.goto(`${adminOrigin}${route}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

for (const route of [
  "/login",
  "/register/check-email",
  "/forgot-password",
  "/reset-password",
  "/invite/invalid",
  "/verify/invalid",
]) {
  test(`unified account route ${route} has no detectable WCAG A or AA violations`, async ({
    page,
  }) => {
    const response = await page.goto(`${configuredAdminPreviewOrigin}${route}`);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

for (const authUrl of [
  `${adminOrigin}/login`,
  `${configuredAdminPreviewOrigin}/login`,
]) {
  test(`auth layout at ${authUrl} stays usable on a compact viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 667, width: 320 });
    const response = await page.goto(authUrl);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

for (const authUrl of [
  `${adminOrigin}/login`,
  `${configuredAdminPreviewOrigin}/login`,
]) {
  test(`auth method picker at ${authUrl} exposes passkey and stages credentials safely`, async ({
    page,
  }) => {
    const response = await page.goto(authUrl);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", { name: "Continue with email" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with passkey" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Continue with email" }).click();
    await expect(
      page.getByRole("heading", { name: "What’s your email address?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();

    await page.getByRole("link", { name: "Back to login" }).click();
    await expect(
      page.getByRole("button", { name: "Continue with passkey" }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}
