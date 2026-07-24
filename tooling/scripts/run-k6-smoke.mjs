import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { requireStagingTarget } from "./staging-target.mjs";

const target = requireStagingTarget("K6_TARGET_URL");
const reportDirectory = path.resolve("test-results/k6");
const summaryPath = path.join(reportDirectory, "summary.json");

mkdirSync(reportDirectory, { recursive: true });

const result = spawnSync(
  "k6",
  ["run", "--summary-export", summaryPath, "tests/load/public-smoke.js"],
  {
    env: {
      ...process.env,
      K6_TARGET_URL: target.toString(),
    },
    stdio: "inherit",
  },
);

if (result.error?.code === "ENOENT") {
  throw new Error(
    "k6 is not installed. Install the pinned CI version documented in the staging test runbook.",
  );
}

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
