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
    page.getByRole("link", { name: "Start a project" }),
  ).toHaveAttribute("href", "mailto:info@shapewebs.com");
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
