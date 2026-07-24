import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { requireStagingTarget } from "./staging-target.mjs";

const zapImage =
  "zaproxy/zap-stable@sha256:8d387b1a63e3425beef4846e39719f5af2a787753af2d8b6558c6257d7a577a2";
const target = requireStagingTarget("ZAP_TARGET_URL");
const reportDirectory = path.resolve("test-results/zap");

mkdirSync(reportDirectory, { recursive: true });

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--volume",
    `${reportDirectory}:/zap/wrk:rw`,
    zapImage,
    "zap-baseline.py",
    "-t",
    target.toString(),
    "-m",
    "1",
    "-J",
    "report.json",
    "-w",
    "report.md",
    "-r",
    "report.html",
  ],
  { stdio: "inherit" },
);

if (result.error?.code === "ENOENT") {
  throw new Error(
    "Docker is not installed. ZAP release verification requires a Docker-compatible runtime.",
  );
}

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
