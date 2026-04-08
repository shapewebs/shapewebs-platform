import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
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
