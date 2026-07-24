import { rmSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..");
const generatedPaths = [
  ".lighthouseci",
  ".turbo",
  "apps/admin/.next",
  "apps/web/.next",
  "coverage",
  "playwright-report",
  "test-results",
  "workers/outbox-scheduler/.wrangler/build",
];

for (const generatedPath of generatedPaths) {
  rmSync(resolve(repositoryRoot, generatedPath), {
    force: true,
    recursive: true,
  });
}

console.log(`Removed ${generatedPaths.length} known generated artifact paths.`);
