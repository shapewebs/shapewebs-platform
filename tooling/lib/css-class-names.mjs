import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const CSS_CLASS_NAME_PATTERN =
  /^(?<scope>[a-z][a-z0-9]*)-(?<role>[a-z][a-z0-9]*)-(?<id>[a-z0-9]{6})$/;
export const CSS_CLASS_PART_PATTERN = /^[a-z][a-z0-9]*$/;

const classSelectorPattern = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
const ignoredDirectories = new Set([
  ".git",
  ".lighthouseci",
  ".next",
  ".sanity",
  ".turbo",
  ".wrangler",
  "coverage",
  "node_modules",
  "playwright-report",
  "test-results",
]);

export function listFiles(repositoryRoot, directories, predicate) {
  const files = [];

  function visit(directory) {
    const absoluteDirectory = resolve(repositoryRoot, directory);

    // eslint-disable-next-line security/detect-non-literal-fs-filename -- Traversal is limited to repository-owned roots and rejects ignored artifact directories.
    for (const entry of readdirSync(absoluteDirectory, {
      withFileTypes: true,
    })) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      const absolutePath = join(absoluteDirectory, entry.name);
      const repositoryPath = relative(repositoryRoot, absolutePath);

      if (entry.isDirectory()) {
        visit(repositoryPath);
      } else if (entry.isFile() && predicate(repositoryPath)) {
        files.push(repositoryPath);
      }
    }
  }

  for (const directory of directories) {
    visit(directory);
  }

  return files.sort();
}

export function readRepositoryFile(repositoryRoot, repositoryPath) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- Callers provide paths discovered beneath the repository root.
  return readFileSync(resolve(repositoryRoot, repositoryPath), "utf8");
}

export function extractCssClassNames(source) {
  const classNames = new Set();
  const sourceWithoutCommentsOrStrings = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");

  for (const match of sourceWithoutCommentsOrStrings.matchAll(
    classSelectorPattern,
  )) {
    classNames.add(match[1]);
  }

  return [...classNames].sort();
}

export function collectCssClassDefinitions(repositoryRoot) {
  const cssModules = listFiles(
    repositoryRoot,
    ["apps", "packages"],
    (repositoryPath) => repositoryPath.endsWith(".module.css"),
  );
  const definitions = [];

  for (const repositoryPath of cssModules) {
    const source = readRepositoryFile(repositoryRoot, repositoryPath);

    for (const className of extractCssClassNames(source)) {
      definitions.push({ className, repositoryPath });
    }
  }

  return { cssModules, definitions };
}

export function parseCssClassName(className) {
  return CSS_CLASS_NAME_PATTERN.exec(className)?.groups ?? null;
}
