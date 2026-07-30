import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const failures = [];

function repositoryPath(pathname) {
  return resolve(repositoryRoot, pathname);
}

function read(pathname) {
  return readFileSync(repositoryPath(pathname), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function assertIncludes(pathname, expected, message) {
  assert(read(pathname).includes(expected), `${message} (${pathname})`);
}

function listFiles(directory, predicate = () => true) {
  const absoluteDirectory = repositoryPath(directory);

  return readdirSync(absoluteDirectory, {
    recursive: true,
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parent = entry.parentPath ?? entry.path;
      return relative(repositoryRoot, join(parent, entry.name));
    })
    .filter(predicate)
    .sort();
}

const themeFile = "packages/ui/src/styles/system-theme.css";
const requiredThemeTokens = [
  "--sw-ui-font-sans",
  "--sw-ui-space-1",
  "--sw-ui-space-10",
  "--sw-ui-radius-xs",
  "--sw-ui-radius-xl",
  "--sw-ui-content-copy",
  "--sw-ui-content-wide",
  "--sw-ui-color-bg-primary",
  "--sw-ui-color-text-primary",
  "--sw-ui-color-focus-ring",
  "--sw-ui-shadow-raised",
];

assertIncludes(
  themeFile,
  '[data-sw-theme="showcase"]',
  "The public showcase theme must remain explicit",
);
assertIncludes(
  themeFile,
  '[data-sw-theme="studio"]',
  "The employee studio theme must remain explicit",
);

for (const token of requiredThemeTokens) {
  assertIncludes(
    themeFile,
    token,
    `Missing required foundation token ${token}`,
  );
}

assertIncludes(
  "apps/web/src/app/layout.tsx",
  'data-sw-theme="showcase"',
  "The public app must select the showcase theme",
);
assertIncludes(
  "apps/admin/src/app/layout.tsx",
  'data-sw-theme="studio"',
  "The admin app must select the studio theme",
);

const publicPages = listFiles("apps/web/src/app", (pathname) =>
  pathname.endsWith("/page.tsx"),
);
const expectedPublicPages = [
  "apps/web/src/app/(marketing)/page.tsx",
  "apps/web/src/app/preview/[[...slug]]/page.tsx",
];

assert(
  JSON.stringify(publicPages) === JSON.stringify(expectedPublicPages),
  `Unexpected public page routes. Expected ${expectedPublicPages.join(", ")}; found ${publicPages.join(", ")}`,
);

assert(
  /return\s+null\s*;/.test(read("apps/web/src/app/(marketing)/page.tsx")),
  "The public homepage body must remain empty until its approved redesign",
);
assertIncludes(
  "apps/web/src/app/(marketing)/layout.tsx",
  "<PublicShell>",
  "The marketing layout must retain the rebuilt public shell",
);
assertIncludes(
  "apps/web/src/components/site/public-shell.tsx",
  "<SiteHeader />",
  "The public shell must retain the rebuilt header",
);
assertIncludes(
  "apps/web/src/components/site/public-shell.tsx",
  "<SiteFooter />",
  "The public shell must retain the rebuilt footer",
);
assertIncludes(
  "apps/web/src/components/site/site-header.tsx",
  "<Layout.Container",
  "The header must use shared layout primitives",
);
assertIncludes(
  "apps/web/src/components/site/site-header.tsx",
  "<Buttons.ButtonAnchor",
  "The header action must use the shared button system",
);
assertIncludes(
  "apps/web/src/components/site/site-footer.tsx",
  "<Layout.Container",
  "The footer must use shared layout primitives",
);
assertIncludes(
  "apps/web/src/components/site/site-brand.tsx",
  "<Brand.ShapewebsBrand",
  "Header and footer branding must use the shared brand component",
);

assertIncludes(
  "apps/web/src/app/sitemap.ts",
  "url: siteConfig.productionUrl",
  "The reset public site must expose only its canonical homepage",
);
assertIncludes(
  "apps/web/src/app/robots.ts",
  'allow: "/"',
  "The public homepage must remain crawlable for the SEO release budget",
);

const removedLegacyPublicFiles = [
  "apps/web/src/components/site/marketing-shell.tsx",
  "apps/web/src/components/site/site-logo.tsx",
  "apps/web/src/components/site/site-navigation-data.ts",
  "apps/web/src/components/site/blank-stage.tsx",
  "apps/web/src/components/forms/inquiry-forms.tsx",
  "apps/web/src/app/(marketing)/page.module.css",
];

for (const pathname of removedLegacyPublicFiles) {
  assert(
    !existsSync(repositoryPath(pathname)),
    `Obsolete public implementation must stay removed (${pathname})`,
  );
}

const applicationSourceFiles = [
  ...listFiles("apps/web/src", (pathname) =>
    [".css", ".tsx"].includes(extname(pathname)),
  ),
  ...listFiles("apps/admin/src", (pathname) =>
    [".css", ".tsx"].includes(extname(pathname)),
  ),
];
const prohibitedCompatibilityReferences = [
  /var\(--color-/,
  /var\(--font-(?!family)/,
  /var\(--system-/,
  /rgba\(var\(--color-/,
];

for (const pathname of applicationSourceFiles) {
  const source = read(pathname);

  for (const pattern of prohibitedCompatibilityReferences) {
    assert(
      !pattern.test(source),
      `Application source must use semantic --sw-ui-* tokens directly (${pathname})`,
    );
  }

  if (pathname.endsWith(".tsx")) {
    assert(
      !/<button(?:\s|>)/.test(source),
      `Application buttons must use the shared button system (${pathname})`,
    );
  }
}

const sharedUiCss = listFiles("packages/ui/src", (pathname) =>
  pathname.endsWith(".module.css"),
);
const applicationCss = applicationSourceFiles.filter((pathname) =>
  pathname.endsWith(".module.css"),
);
const customClassPattern = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
const shapewebsClassPattern = /^sw-[a-z0-9]+-[a-z0-9]+-[a-z0-9]{6}$/;

for (const pathname of [...applicationCss, ...sharedUiCss]) {
  const source = read(pathname);

  for (const match of source.matchAll(customClassPattern)) {
    assert(
      shapewebsClassPattern.test(match[1]),
      `Invalid custom class "${match[1]}" in ${pathname}`,
    );
  }
}

if (failures.length > 0) {
  console.error("Visual foundation verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Visual foundation verified: ${applicationCss.length + sharedUiCss.length} CSS modules, empty public canvas, rebuilt shell, explicit themes, and semantic application contracts.`,
);
