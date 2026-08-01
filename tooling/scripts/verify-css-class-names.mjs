import { dirname, extname, relative, resolve } from "node:path";
import process from "node:process";

import {
  collectCssClassDefinitions,
  extractCssClassNames,
  listFiles,
  parseCssClassName,
  readRepositoryFile,
} from "../lib/css-class-names.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const failures = [];
const { cssModules, definitions } = collectCssClassDefinitions(repositoryRoot);
const definitionsByClass = new Map();
const classesById = new Map();

const globalCssFiles = listFiles(
  repositoryRoot,
  ["apps", "packages"],
  (repositoryPath) =>
    repositoryPath.endsWith(".css") && !repositoryPath.endsWith(".module.css"),
);

for (const repositoryPath of globalCssFiles) {
  const classNames = extractCssClassNames(
    readRepositoryFile(repositoryRoot, repositoryPath),
  );

  for (const className of classNames) {
    failures.push(
      `Global class "${className}" in ${repositoryPath}; authored classes belong in CSS Modules.`,
    );
  }
}

function fail(message) {
  failures.push(message);
}

for (const { className, repositoryPath } of definitions) {
  const parsed = parseCssClassName(className);

  if (!parsed) {
    fail(
      `Invalid class "${className}" in ${repositoryPath}; expected scope-role-id6.`,
    );
    continue;
  }

  if (["sw", "ui"].includes(parsed.scope)) {
    fail(
      `Generic class scope "${parsed.scope}" is forbidden in ${repositoryPath}.`,
    );
  }

  const definitionPaths = definitionsByClass.get(className) ?? [];
  definitionPaths.push(repositoryPath);
  definitionsByClass.set(className, definitionPaths);

  const idClasses = classesById.get(parsed.id) ?? new Set();
  idClasses.add(className);
  classesById.set(parsed.id, idClasses);
}

for (const [className, repositoryPaths] of definitionsByClass) {
  if (repositoryPaths.length > 1) {
    fail(
      `Class "${className}" is defined in multiple modules: ${repositoryPaths.join(", ")}.`,
    );
  }
}

for (const [id, classNames] of classesById) {
  if (classNames.size > 1) {
    fail(
      `Class ID "${id}" is reused by: ${[...classNames].sort().join(", ")}.`,
    );
  }
}

const sourceFiles = listFiles(
  repositoryRoot,
  ["apps", "packages"],
  (repositoryPath) =>
    [".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(
      extname(repositoryPath),
    ),
);
const cssModuleImportPattern =
  /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+(["'])([^"']+\.module\.css)\2/g;
const cssModuleReferencePattern =
  /\b([A-Za-z_$][A-Za-z0-9_$]*)\[(["'])([^"']+)\2\]/g;
const dotReferencePattern =
  /\b([A-Za-z_$][A-Za-z0-9_$]*)\.([A-Za-z_$][A-Za-z0-9_$]*)/g;
const rawClassNamePattern = /\bclassName\s*=\s*(["'])([^"']*)\1/g;

function resolveCssModuleImport(repositoryPath, importPath) {
  if (importPath.startsWith("@/")) {
    const applicationRoot = /^(apps\/[^/]+)\/src\//.exec(repositoryPath)?.[1];

    if (!applicationRoot) {
      return null;
    }

    return `${applicationRoot}/src/${importPath.slice(2)}`;
  }

  return relative(
    repositoryRoot,
    resolve(repositoryRoot, dirname(repositoryPath), importPath),
  );
}

for (const repositoryPath of sourceFiles) {
  const source = readRepositoryFile(repositoryRoot, repositoryPath);
  const importedModules = new Map();

  for (const importMatch of source.matchAll(cssModuleImportPattern)) {
    const importName = importMatch[1];
    const importedRepositoryPath = resolveCssModuleImport(
      repositoryPath,
      importMatch[3],
    );

    if (!importedRepositoryPath) {
      fail(
        `Cannot resolve CSS Module import "${importMatch[3]}" in ${repositoryPath}.`,
      );
      continue;
    }
    importedModules.set(importName, {
      definitions: new Set(
        definitions
          .filter(
            ({ repositoryPath: definitionPath }) =>
              definitionPath === importedRepositoryPath,
          )
          .map(({ className }) => className),
      ),
      repositoryPath: importedRepositoryPath,
    });
  }

  for (const match of source.matchAll(cssModuleReferencePattern)) {
    const importedModule = importedModules.get(match[1]);

    if (importedModule) {
      const className = match[3];

      if (!parseCssClassName(className)) {
        fail(
          `Invalid CSS Module reference "${className}" in ${repositoryPath}; expected scope-role-id6.`,
        );
      } else if (!importedModule.definitions.has(className)) {
        fail(
          `CSS Module reference "${className}" in ${repositoryPath} is not defined by ${importedModule.repositoryPath}.`,
        );
      }
    }
  }

  for (const match of source.matchAll(dotReferencePattern)) {
    if (importedModules.has(match[1])) {
      fail(
        `Dot-notation CSS Module reference "${match[1]}.${match[2]}" in ${repositoryPath}; use the generated bracket-notation class name.`,
      );
    }
  }

  for (const match of source.matchAll(rawClassNamePattern)) {
    if (match[2].trim()) {
      fail(
        `Raw className literal "${match[2]}" in ${repositoryPath}; use a CSS Module class.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error("CSS class naming verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `CSS class naming verified: ${definitionsByClass.size} globally unique classes across ${cssModules.length} CSS Modules.`,
);
