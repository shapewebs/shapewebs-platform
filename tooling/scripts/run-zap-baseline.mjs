import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import {
  requireAutomationBypassSecret,
  requireStagingTarget,
} from "./staging-target.mjs";

const zapImage =
  "zaproxy/zap-stable@sha256:8d387b1a63e3425beef4846e39719f5af2a787753af2d8b6558c6257d7a577a2";
const target = requireStagingTarget("ZAP_TARGET_URL");
const automationBypassSecret = requireAutomationBypassSecret();
const reportDirectory = path.resolve("test-results/zap");
const containerUserId = process.getuid?.();
const containerGroupId = process.getgid?.();

if (!Number.isInteger(containerUserId) || !Number.isInteger(containerGroupId)) {
  throw new Error(
    "ZAP release verification requires a host with numeric user and group IDs.",
  );
}

const secretDirectory = mkdtempSync(
  path.join(os.tmpdir(), "shapewebs-zap-secrets-"),
);
const zapHomeDirectory = mkdtempSync(
  path.join(os.tmpdir(), "shapewebs-zap-home-"),
);
const secretConfigPath = path.join(secretDirectory, "vercel-bypass.properties");

mkdirSync(reportDirectory, { recursive: true });

let result;

try {
  writeFileSync(
    secretConfigPath,
    [
      "replacer.full_list(0).description=Vercel staging automation bypass",
      "replacer.full_list(0).enabled=true",
      "replacer.full_list(0).matchtype=REQ_HEADER",
      "replacer.full_list(0).matchstr=x-vercel-protection-bypass",
      "replacer.full_list(0).regex=false",
      `replacer.full_list(0).replacement=${automationBypassSecret}`,
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600 },
  );

  result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--user",
      `${containerUserId}:${containerGroupId}`,
      "--env",
      "HOME=/home/zap",
      "--workdir",
      "/zap/wrk",
      "--volume",
      `${reportDirectory}:/zap/wrk:rw`,
      "--volume",
      `${secretDirectory}:/zap/secrets:ro`,
      "--volume",
      `${zapHomeDirectory}:/home/zap:rw`,
      zapImage,
      "/zap/zap-baseline.py",
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
      // Keep the packaged passive scan off the Automation Framework so every
      // generated artifact stays inside the explicitly mounted report path.
      "--autooff",
      "-z",
      "-configfile /zap/secrets/vercel-bypass.properties",
    ],
    { stdio: "inherit" },
  );
} finally {
  rmSync(secretDirectory, { force: true, recursive: true });
  rmSync(zapHomeDirectory, { force: true, recursive: true });
}

if (result?.error?.code === "ENOENT") {
  throw new Error(
    "Docker is not installed. ZAP release verification requires a Docker-compatible runtime.",
  );
}

if (result?.error) {
  throw result.error;
}

process.exitCode = result?.status ?? 1;
