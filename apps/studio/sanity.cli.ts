import { defineCliConfig } from "sanity/cli";

function requireEnvironmentValue(
  name: "SANITY_STUDIO_DATASET" | "SANITY_STUDIO_PROJECT_ID",
): string {
  const value =
    name === "SANITY_STUDIO_DATASET"
      ? process.env.SANITY_STUDIO_DATASET?.trim()
      : process.env.SANITY_STUDIO_PROJECT_ID?.trim();

  if (!value) {
    throw new Error(`${name} is required for Shapewebs Sanity commands.`);
  }

  return value;
}

export default defineCliConfig({
  api: {
    dataset: requireEnvironmentValue("SANITY_STUDIO_DATASET"),
    projectId: requireEnvironmentValue("SANITY_STUDIO_PROJECT_ID"),
  },
  deployment: {
    autoUpdates: false,
  },
  server: {
    hostname: "localhost",
    port: 3333,
  },
});
