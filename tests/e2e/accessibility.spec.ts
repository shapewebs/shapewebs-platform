import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const route of ["/", "/contact"]) {
  test(`${route} has no automatically detectable WCAG A or AA violations`, async ({
    page,
  }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

    expect(results.violations).toEqual([]);
  });
}

test("open mobile navigation has no automatically detectable violations", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await page.locator('summary[aria-label="Toggle menu"]').click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();

  expect(results.violations).toEqual([]);
});
