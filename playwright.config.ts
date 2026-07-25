import { defineConfig, devices } from "@playwright/test";

const webOrigin = "http://127.0.0.1:3100";
const adminOrigin = "http://127.0.0.1:3101";
const missingAuthEnvironment = {
  ADMIN_OWNER_EMAILS: "admin@shapewebs.test",
  BETTER_AUTH_SECRET: "shapewebs-test-secret-with-at-least-32-characters",
  BETTER_AUTH_TRUSTED_ORIGINS: adminOrigin,
  BETTER_AUTH_URL: adminOrigin,
  DATABASE_URL: "",
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
  NEXT_PUBLIC_SITE_URL: webOrigin,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  RESEND_API_KEY: "",
  SHAPEWEBS_ORGANIZATION_ID: "00000000-0000-4000-8000-000000000001",
  SUPABASE_SERVICE_ROLE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
};

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: "test-results",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: webOrigin,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "corepack pnpm --filter @shapewebs/web exec next start --port 3100",
      env: missingAuthEnvironment,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: 1_000,
      },
      name: "web",
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${webOrigin}/api/health`,
    },
    {
      command:
        "corepack pnpm --filter @shapewebs/admin exec next start --port 3101",
      env: missingAuthEnvironment,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: 1_000,
      },
      name: "admin",
      reuseExistingServer: false,
      timeout: 120_000,
      url: `${adminOrigin}/api/health`,
    },
  ],
  workers: process.env.CI ? 1 : undefined,
});
