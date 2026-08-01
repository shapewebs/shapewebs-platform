import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      exclude: [
        "**/*.d.ts",
        "**/*.config.*",
        "**/generated/**",
        "**/mock/**",
        "**/node_modules/**",
        "**/tests/**",
      ],
      include: [
        "apps/admin/src/lib/auth-environment.ts",
        "apps/admin/src/lib/public-revalidation.ts",
        "apps/admin/src/lib/redirect.ts",
        "apps/web/src/lib/rate-limit.ts",
        "packages/config/src/security.ts",
        "packages/observability/src/structured-logging.ts",
        "workers/outbox-scheduler/src/scheduler.ts",
      ],
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
});
