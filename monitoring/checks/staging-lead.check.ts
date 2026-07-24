import { BrowserCheck, Frequency } from "checkly/constructs";

import { operationalEmailAlerts } from "../lib/alert-channels";
import {
  getExactStagingHttpsOrigin,
  isChecklyCheckActivated,
} from "../lib/environment";

const stagingBaseUrl = getExactStagingHttpsOrigin(
  "CHECKLY_STAGING_WEB_BASE_URL",
);

const checkId = "staging-lead-journey";
const contactUrl = new URL("/contact", stagingBaseUrl).toString();

new BrowserCheck(checkId, {
  name: "Staging lead acceptance journey",
  activated: isChecklyCheckActivated(checkId),
  alertChannels: [operationalEmailAlerts],
  frequency: Frequency.EVERY_10M,
  locations: ["eu-west-1"],
  code: {
    content: `
        const { expect, test } = require("@playwright/test");

        test("persists one synthetic staging lead", async ({ page }) => {
          const protectionBypass =
            process.env.SHAPEWEBS_STAGING_WEB_BYPASS_SECRET ?? "";

          if (!/^[A-Za-z0-9_-]{32,128}$/.test(protectionBypass)) {
            throw new Error(
              "SHAPEWEBS_STAGING_WEB_BYPASS_SECRET is unavailable or invalid.",
            );
          }

          await page.setExtraHTTPHeaders({
            "x-vercel-protection-bypass": protectionBypass,
            "x-vercel-set-bypass-cookie": "true",
          });

          await page.goto(${JSON.stringify(contactUrl)}, {
            waitUntil: "domcontentloaded",
          });

          const form = page.locator("form").first();
          await form.getByLabel("Name").fill("Checkly Synthetic Monitor");
          await form
            .getByLabel("Email")
            .fill("synthetic-monitor@shapewebs.invalid");
          await form
            .getByLabel("Company")
            .fill("CHECKLY_SYNTHETIC_DO_NOT_CONTACT");
          await form
            .getByLabel("Message")
            .fill("Synthetic staging reliability check. Safe to delete.");
          await form
            .locator('input[name="consentAccepted"]')
            .check();

          const turnstileResponse = form.locator(
            'input[name="cf-turnstile-response"]',
          );
          await expect(turnstileResponse).toHaveValue(/.+/, {
            timeout: 15_000,
          });

          const responsePromise = page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              response.url().endsWith("/api/forms/contact"),
          );
          await form.getByRole("button", {
            name: "Send contact request",
          }).click();
          const response = await responsePromise;

          expect(response.status()).toBe(200);
          await expect(form).toContainText(
            "Thanks, your message has been received.",
          );
        });
      `,
  },
  playwrightConfig: {
    use: {
      locale: "en-GB",
      timezoneId: "Europe/Copenhagen",
    },
  },
  tags: ["lead", "staging", "synthetic"],
});
