import { defineConfig } from "checkly";
import { Frequency } from "checkly/constructs";

export default defineConfig({
  projectName: "Shapewebs platform",
  logicalId: "shapewebs-platform",
  repoUrl: "https://github.com/shapewebs/shapewebs-platform",
  checks: {
    activated: true,
    checkMatch: "monitoring/checks/**/*.check.ts",
    frequency: Frequency.EVERY_2M,
    locations: ["eu-west-1"],
    runtimeId: "2025.04",
    tags: ["managed-as-code", "shapewebs"],
  },
  cli: {
    reporters: ["list"],
    retries: 0,
    runLocation: "eu-west-1",
  },
});
