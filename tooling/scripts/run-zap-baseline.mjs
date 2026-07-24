import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
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
const baselineConfigPath = path.resolve("tooling/zap/baseline.conf");

const secretDirectory = mkdtempSync(
  path.join(os.tmpdir(), "shapewebs-zap-secrets-"),
);
const secretConfigPath = path.join(secretDirectory, "vercel-bypass.properties");

mkdirSync(reportDirectory, { recursive: true });
const reportDirectoryMode = statSync(reportDirectory).mode & 0o777;

let result;

try {
  // The official image runs as its non-root `zap` user (UID 1000). GitHub's
  // runner has a different UID, so grant that container user access only while
  // the isolated scan is running, then restore the host directory mode.
  chmodSync(reportDirectory, 0o777);
  chmodSync(secretDirectory, 0o711);
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
    { encoding: "utf8", mode: 0o444 },
  );

  result = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--workdir",
      "/zap/wrk",
      "--volume",
      `${reportDirectory}:/zap/wrk:rw`,
      "--volume",
      `${secretDirectory}:/zap/secrets:ro`,
      "--volume",
      `${baselineConfigPath}:/zap/config/baseline.conf:ro`,
      zapImage,
      "sh",
      "-c",
      [
        "status=0",
        '/zap/zap-baseline.py "$@" || status=$?',
        "if [ -f /tmp/shapewebs-zap-home/zap.log ]; then",
        "  cp /tmp/shapewebs-zap-home/zap.log /zap/wrk/zap.log || true",
        "fi",
        'exit "$status"',
      ].join("\n"),
      "shapewebs-zap",
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
      "-c",
      "/zap/config/baseline.conf",
      // Keep the packaged passive scan off the Automation Framework so every
      // generated report stays inside the explicitly mounted report path.
      "--autooff",
      "-z",
      "-dir /tmp/shapewebs-zap-home -configfile /zap/secrets/vercel-bypass.properties",
    ],
    { stdio: "inherit" },
  );
} finally {
  chmodSync(reportDirectory, reportDirectoryMode);
  rmSync(secretDirectory, { force: true, recursive: true });
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
