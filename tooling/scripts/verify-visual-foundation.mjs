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
  "--font-sans",
  "--space-1",
  "--space-10",
  "--radius-xs",
  "--radius-xl",
  "--content-copy",
  "--content-width",
  "--color-bg-primary",
  "--color-bg-brand",
  "--color-bg-brand-hover",
  "--color-bg-brand-active",
  "--color-text-primary",
  "--color-focus-ring",
  "--shadow-button-default",
  "--shadow-button-secondary",
  "--shadow-button-secondary-hover",
  "--shadow-raised",
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
  themeFile,
  "--content-width: 1344px;",
  "The shared content width must remain 1344px",
);
assertIncludes(
  themeFile,
  "--shadow-button-default: 0px 3px 6px -2px #00000005, 0px 1px 1px #0000000a;",
  "Default, primary, and brand buttons must retain the approved shadow value",
);
assertIncludes(
  themeFile,
  "0 0 0 0.5px #00000016, 0px 3px 6px -2px #00000005, 0px 1px 1px #0000000a;",
  "Secondary buttons must retain the approved shadow value",
);
assertIncludes(
  themeFile,
  "0 0 0 0.5px #00000026, 0px 3px 6px -2px #00000005, 0px 1px 1px #0000000a;",
  "Secondary buttons must retain the approved hover shadow value",
);

const sharedButtonStyles = read(
  "packages/ui/src/system/buttons/button.module.css",
);
const sharedButtonStyleFiles = listFiles(
  "packages/ui/src/system/buttons",
  (pathname) => pathname.endsWith(".module.css"),
);
assert(
  sharedButtonStyles.includes("border-radius: var(--radius-rounded);"),
  "Shared buttons must retain the approved pill radius",
);
assert(
  !sharedButtonStyles.includes("transform:"),
  "Shared buttons must not move or scale during interaction",
);
assert(
  sharedButtonStyles.includes("border: 0;") &&
    !/^\s*border-(?:color|style|width):/gm.test(sharedButtonStyles),
  "Shared buttons must use shadows rather than physical borders",
);
assert(
  sharedButtonStyles.includes("font-weight: var(--font-weight-normal);") &&
    !sharedButtonStyles.includes("font-weight: var(--font-weight-medium);"),
  "Shared buttons must retain normal font weight",
);
assert(
  sharedButtonStyles.includes("color: rgb(var(--color-bg-primary) / 1);"),
  "Brand buttons must use the primary surface color for their label",
);
for (const pathname of sharedButtonStyleFiles) {
  const styles = read(pathname);
  const borderDeclarations =
    styles.match(/^\s*border(?:-(?:color|style|width))?:[^\n]+/gm) ?? [];
  assert(
    borderDeclarations.every((declaration) =>
      /^\s*border:\s*(?:0|none);?\s*$/.test(declaration),
    ),
    `Shared button controls must not use physical borders (${pathname})`,
  );
}
assert(
  sharedButtonStyles.includes("box-shadow: var(--shadow-button-default);"),
  "Primary and brand buttons must retain the approved quiet shadow",
);
assert(
  sharedButtonStyles.includes("box-shadow: var(--shadow-button-secondary);"),
  "Secondary buttons must retain the approved outlined shadow",
);
assert(
  sharedButtonStyles.includes(
    "box-shadow: var(--shadow-button-secondary-hover);",
  ),
  "Secondary buttons must retain the approved hover shadow",
);
for (const height of ["32px", "38px", "44px"]) {
  assert(
    sharedButtonStyles.includes(`--button-height: ${height};`),
    `Shared buttons must retain the approved ${height} size`,
  );
}
assert(
  sharedButtonStyles.includes("--button-hit-area-offset: -6px;"),
  "Compact buttons must preserve a 44px interaction area",
);
assert(
  /\.button-ghost-[a-z0-9]{6}\s*\{[^}]*border-radius:\s*var\(--radius-rounded\);/s.test(
    sharedButtonStyles,
  ),
  "Ghost buttons must explicitly retain the shared pill radius",
);

const sharedControlStyles = read(
  "packages/ui/src/system/forms/control.module.css",
);
assert(
  sharedControlStyles.includes("border-radius: var(--radius-sm);"),
  "Shared form controls must retain the approved field radius",
);
assert(
  !sharedControlStyles.includes("transform:"),
  "Shared form controls must not move or scale during interaction",
);
for (const height of ["32px", "38px", "44px"]) {
  assert(
    sharedControlStyles.includes(`--control-height: ${height};`),
    `Shared form controls must retain the approved ${height} size`,
  );
}

assertIncludes(
  "packages/ui/src/system/authentication/auth-layout.tsx",
  'data-sw-theme="studio"',
  "Signed-out authentication surfaces must use the shared studio theme",
);
assertIncludes(
  "packages/ui/src/system/authentication/auth-layout.tsx",
  "<ShapewebsBrand />",
  "Signed-out authentication surfaces must use the shared brand component",
);
assertIncludes(
  "packages/ui/src/system/authentication/auth-stage-transition.module.css",
  "transition: opacity 140ms var(--ease-out-quad);",
  "Authentication method changes must use the approved opacity-only transition",
);
assert(
  !read(
    "packages/ui/src/system/authentication/auth-stage-transition.module.css",
  ).includes("transform:"),
  "Authentication method changes must not translate or scale content",
);
assertIncludes(
  "packages/ui/src/system/authentication/auth-layout.module.css",
  "max-width: 320px;",
  "Compact authentication forms must retain the approved 320px width",
);
assert(
  read(themeFile).match(/--color-bg-brand: 102 121 221;/g)?.length === 5,
  "Every theme must retain the approved Shapewebs brand color",
);
assert(
  read(themeFile).match(/--color-bg-brand-hover: 89 108 208;/g)?.length === 5,
  "Every theme must retain the approved darker brand hover color",
);
assert(
  !read(
    "packages/ui/src/system/navigation/submenu-navigation.module.css",
  ).includes("font-weight: var(--font-weight-medium);"),
  "Public navigation items must use normal font weight",
);
assertIncludes(
  "apps/admin/src/components/admin-auth-shell.tsx",
  "<Authentication.AuthLayout",
  "Employee authentication pages must use the shared authentication layout",
);
assertIncludes(
  "apps/admin/src/app/(auth)/login/login-form.tsx",
  "<Authentication.AuthStageTransition",
  "The unified account login must use the shared staged method transition",
);

const submenuNavigationStyles = read(
  "packages/ui/src/system/navigation/submenu-navigation.module.css",
);
assert(
  /\.subnav-trigger-[a-z0-9]{6},\s*\.subnav-direct-[a-z0-9]{6}\s*\{[^}]*border-radius:\s*var\(--radius-rounded\);/s.test(
    submenuNavigationStyles,
  ),
  "Desktop navigation ghost controls must retain the shared pill radius",
);
assert(
  /\.subnav-trigger-[a-z0-9]{6},\s*\.subnav-direct-[a-z0-9]{6}\s*\{[^}]*height:\s*32px;[^}]*min-height:\s*32px;/s.test(
    submenuNavigationStyles,
  ),
  "Desktop navigation controls must match the shared small-button height",
);
assert(
  /\.subnav-trigger-[a-z0-9]{6}::before,\s*\.subnav-direct-[a-z0-9]{6}::before\s*\{[^}]*inset:\s*-6px 0;/s.test(
    submenuNavigationStyles,
  ),
  "Compact desktop navigation controls must preserve a 44px interaction area",
);
assert(
  /\.subnav-mobilelink-[a-z0-9]{6},\s*\.subnav-mobiletrigger-[a-z0-9]{6}\s*\{[^}]*border-radius:\s*var\(--radius-rounded\);/s.test(
    submenuNavigationStyles,
  ),
  "Mobile navigation ghost controls must retain the shared pill radius",
);

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
  "<Navigation.SubmenuNavigation",
  "The header must use the shared submenu navigation system",
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
for (const pathname of applicationSourceFiles) {
  const source = read(pathname);

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
const tokenCss = [
  ...listFiles("apps/web/src", (pathname) => pathname.endsWith(".css")),
  ...listFiles("apps/admin/src", (pathname) => pathname.endsWith(".css")),
  ...listFiles("packages/ui/src", (pathname) => pathname.endsWith(".css")),
];
const removedTokenPrefixes = [["--", "sw-"].join(""), ["--", "ui-"].join("")];

for (const pathname of tokenCss) {
  const source = read(pathname);

  for (const prefix of removedTokenPrefixes) {
    assert(
      !source.includes(prefix),
      `CSS custom properties must not use removed namespace ${prefix} (${pathname})`,
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
