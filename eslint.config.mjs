import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import security from "eslint-plugin-security";

const nextRootSettings = {
  next: {
    rootDir: ["apps/*/"],
  },
};

function withWorkspaceNextRoots(configs) {
  return configs.map((config) => ({
    ...config,
    settings: {
      ...config.settings,
      ...nextRootSettings,
    },
  }));
}

const eslintConfig = defineConfig([
  ...withWorkspaceNextRoots(nextVitals),
  ...withWorkspaceNextRoots(nextTs),
  security.configs.recommended,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["tooling/scripts/**/*.mjs"],
    rules: {
      // Tool paths are derived from the repository root and discovered files.
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-object-injection": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "**/.next/**",
    ".turbo/**",
    "out/**",
    "build/**",
    "dist/**",
    "apps/*/next-env.d.ts",
  ]),
]);

export default eslintConfig;
