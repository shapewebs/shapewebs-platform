import { expect, test } from "@playwright/test";

test("homepage is semantic, static, and free of third-party requests", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Websites that feel alive.",
  );
  await expect(
    page.locator("main").getByRole("link", {
      name: "Start a project",
      exact: true,
    }),
  ).toHaveAttribute("href", "/contact");

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    h1Count: document.querySelectorAll("h1").length,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(layout.h1Count).toBe(1);
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

test("native mobile navigation is hidden when closed and usable when open", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  const menu = page.locator("details");

  await expect(menu).not.toHaveAttribute("open", "");
  await expect(navigation).not.toBeVisible();

  await page.locator('summary[aria-label="Toggle menu"]').click();

  await expect(menu).toHaveAttribute("open", "");
  await expect(navigation).toBeVisible();
  await expect(
    navigation.getByRole("link", { name: "Start a project", exact: true }),
  ).toHaveAttribute("href", "/contact");

  const pageWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));

  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
});
