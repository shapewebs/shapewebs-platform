import { spawn } from "node:child_process";

const commandName = process.argv[2];
let commandArguments;

if (commandName === "build") {
  commandArguments = [
    "build",
    ".sanity/build",
    "--yes",
    "--minify",
    "--no-source-maps",
  ];
} else if (commandName === "schema-validate") {
  commandArguments = ["schema", "validate", "--level", "warning"];
}
const offlineDataset =
  process.env.SANITY_STUDIO_DATASET?.trim() || "offline-validation";
const offlineProjectId =
  process.env.SANITY_STUDIO_PROJECT_ID?.trim() || "localtest";

if (!commandArguments) {
  throw new Error("An approved offline Sanity command is required.");
}

const child = spawn("sanity", commandArguments, {
  env: {
    ...process.env,
    SANITY_STUDIO_DATASET: offlineDataset,
    SANITY_STUDIO_PROJECT_ID: offlineProjectId,
  },
  stdio: "inherit",
});

child.once("error", (error) => {
  throw error;
});

child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
