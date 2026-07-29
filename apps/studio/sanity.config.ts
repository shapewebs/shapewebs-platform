import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { schemaTypes } from "./schemaTypes";

const apiVersion = "2026-07-01";

function requireEnvironmentValue(
  name: "SANITY_STUDIO_DATASET" | "SANITY_STUDIO_PROJECT_ID",
): string {
  const value =
    name === "SANITY_STUDIO_DATASET"
      ? process.env.SANITY_STUDIO_DATASET?.trim()
      : process.env.SANITY_STUDIO_PROJECT_ID?.trim();

  if (!value) {
    throw new Error(`${name} is required to start the Shapewebs Studio.`);
  }

  return value;
}

export default defineConfig({
  dataset: requireEnvironmentValue("SANITY_STUDIO_DATASET"),
  name: "shapewebs_content",
  plugins: [
    structureTool(),
    visionTool({
      defaultApiVersion: apiVersion,
    }),
  ],
  projectId: requireEnvironmentValue("SANITY_STUDIO_PROJECT_ID"),
  schema: {
    types: schemaTypes,
  },
  title: "Shapewebs Content Recovery Studio",
});
