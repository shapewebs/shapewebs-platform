module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 1 }],
        "categories:performance": [
          "error",
          { aggregationMethod: "median", minScore: 0.95 },
        ],
        "categories:seo": ["error", { minScore: 1 }],
        "cumulative-layout-shift": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 0.05 },
        ],
        "first-contentful-paint": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 1_800 },
        ],
        "largest-contentful-paint": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 2_500 },
        ],
        "resource-summary:script:size": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 165_000 },
        ],
        "resource-summary:third-party:count": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 0 },
        ],
        "resource-summary:total:size": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 210_000 },
        ],
        "total-blocking-time": [
          "error",
          { aggregationMethod: "median", maxNumericValue: 150 },
        ],
      },
    },
    collect: {
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      },
      startServerCommand:
        "corepack pnpm --filter @shapewebs/web exec next start --port 3200",
      startServerReadyPattern: "Ready",
      url: ["http://127.0.0.1:3200/"],
    },
    upload: {
      outputDir: ".lighthouseci/reports",
      target: "filesystem",
    },
  },
};
