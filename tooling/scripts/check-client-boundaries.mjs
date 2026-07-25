import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
const clientDirectivePattern = /^\s*["']use client["'];/;
const workspacePackages = new Map();
const violations = [];

async function pathExists(candidate) {
  try {
    await stat(candidate);
    return true;
  } catch {
    return false;
  }
}

async function pathIsFile(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (
      entry.name === ".next" ||
      entry.name === "node_modules" ||
      entry.name === "dist"
    ) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(entryPath)));
      continue;
    }

    if (sourceExtensions.includes(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

async function registerWorkspacePackages(group) {
  const groupDirectory = path.join(workspaceRoot, group);
  const entries = await readdir(groupDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageRoot = path.join(groupDirectory, entry.name);
    const packageJsonPath = path.join(packageRoot, "package.json");

    if (!(await pathExists(packageJsonPath))) {
      continue;
    }

    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

    if (typeof packageJson.name === "string") {
      workspacePackages.set(packageJson.name, {
        exports: packageJson.exports ?? {},
        root: packageRoot,
      });
    }
  }
}

function getImports(source, sourcePath) {
  const imports = [];
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      imports.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

async function resolveSourcePath(candidate) {
  const candidates = [
    candidate,
    ...sourceExtensions.map((extension) => `${candidate}${extension}`),
    ...sourceExtensions.map((extension) =>
      path.join(candidate, `index${extension}`),
    ),
  ];

  for (const sourcePath of candidates) {
    if (await pathIsFile(sourcePath)) {
      return sourcePath;
    }
  }

  return null;
}

function findAppRoot(sourcePath) {
  const relativePath = path.relative(
    path.join(workspaceRoot, "apps"),
    sourcePath,
  );
  const [appName] = relativePath.split(path.sep);
  return appName ? path.join(workspaceRoot, "apps", appName) : null;
}

function getExportTarget(exportsField, exportKey) {
  if (typeof exportsField === "string" && exportKey === ".") {
    return exportsField;
  }

  if (
    exportsField &&
    typeof exportsField === "object" &&
    typeof exportsField[exportKey] === "string"
  ) {
    return exportsField[exportKey];
  }

  return null;
}

async function resolveImport(sourcePath, specifier) {
  if (specifier.startsWith(".")) {
    return resolveSourcePath(path.resolve(path.dirname(sourcePath), specifier));
  }

  if (specifier.startsWith("@/")) {
    const appRoot = findAppRoot(sourcePath);
    return appRoot
      ? resolveSourcePath(path.join(appRoot, "src", specifier.slice(2)))
      : null;
  }

  const packageName = specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
  const workspacePackage = workspacePackages.get(packageName);

  if (!workspacePackage) {
    return null;
  }

  const subpath = specifier.slice(packageName.length);
  const exportKey = subpath ? `.${subpath}` : ".";
  const exportTarget = getExportTarget(workspacePackage.exports, exportKey);

  return exportTarget
    ? resolveSourcePath(path.resolve(workspacePackage.root, exportTarget))
    : null;
}

function recordViolation(entry, chain, message) {
  violations.push({
    entry: path.relative(workspaceRoot, entry),
    chain: chain.map((item) => path.relative(workspaceRoot, item)).join(" -> "),
    message,
  });
}

async function walkClientGraph(entry, sourcePath, chain, visited) {
  if (visited.has(sourcePath)) {
    return;
  }

  visited.add(sourcePath);
  const source = await readFile(sourcePath, "utf8");
  const imports = getImports(source, sourcePath);

  for (const specifier of imports) {
    if (specifier === "server-only" || specifier.startsWith("node:")) {
      recordViolation(
        entry,
        [...chain, sourcePath],
        `Client graph imports forbidden module "${specifier}".`,
      );
      continue;
    }

    if (specifier === "@shapewebs/db") {
      recordViolation(
        entry,
        [...chain, sourcePath],
        'Client code must import the explicit "@shapewebs/db/browser" entry.',
      );
      continue;
    }

    const resolvedImport = await resolveImport(sourcePath, specifier);

    if (!resolvedImport) {
      continue;
    }

    const normalizedImport = resolvedImport.split(path.sep).join("/");

    if (
      normalizedImport.includes("/packages/db/src/repositories/") ||
      normalizedImport.includes("/packages/db/src/supabase/server.") ||
      normalizedImport.includes("/packages/db/src/auth/")
    ) {
      recordViolation(
        entry,
        [...chain, sourcePath, resolvedImport],
        "Client graph reaches a privileged database module.",
      );
      continue;
    }

    await walkClientGraph(
      entry,
      resolvedImport,
      [...chain, sourcePath],
      visited,
    );
  }
}

await Promise.all([
  registerWorkspacePackages("apps"),
  registerWorkspacePackages("packages"),
]);

const appFiles = await listSourceFiles(path.join(workspaceRoot, "apps"));
const clientEntries = [];
const adminAuthPath = path.join(workspaceRoot, "apps/admin/src/lib/auth.ts");

for (const sourcePath of appFiles) {
  const source = await readFile(sourcePath, "utf8");
  const imports = getImports(source, sourcePath);

  if (clientDirectivePattern.test(source)) {
    clientEntries.push(sourcePath);
  }

  for (const specifier of imports) {
    if (
      sourcePath === adminAuthPath &&
      (specifier === "@shapewebs/db" || specifier.startsWith("@shapewebs/db/"))
    ) {
      recordViolation(
        sourcePath,
        [sourcePath],
        "Primary admin authentication must not depend on the transitional Supabase package.",
      );
    }
  }
}

for (const entry of clientEntries) {
  await walkClientGraph(entry, entry, [], new Set());
}

if (violations.length > 0) {
  console.error("Application boundary violations found:\n");

  for (const violation of violations) {
    console.error(`- ${violation.entry}: ${violation.message}`);
    console.error(`  ${violation.chain}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `Application boundaries passed for ${clientEntries.length} client entries.`,
  );
}
