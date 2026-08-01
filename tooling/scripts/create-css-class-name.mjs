import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import process from "node:process";

import {
  collectCssClassDefinitions,
  CSS_CLASS_PART_PATTERN,
  parseCssClassName,
} from "../lib/css-class-names.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const [scope, role, ...unexpectedArguments] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  console.error(
    "Usage: pnpm css:class:create <scope> <role>\n" +
      "Example: pnpm css:class:create button primary",
  );
  process.exit(1);
}

if (!scope || !role || unexpectedArguments.length > 0) {
  fail("Provide exactly one semantic scope and one semantic role.");
}

for (const [label, value] of [
  ["scope", scope],
  ["role", role],
]) {
  if (!CSS_CLASS_PART_PATTERN.test(value)) {
    fail(
      `The ${label} must begin with a lowercase letter and contain only lowercase letters or numbers.`,
    );
  }

  if (["sw", "ui"].includes(value)) {
    fail(`The generic ${label} "${value}" is not allowed.`);
  }
}

const { definitions } = collectCssClassDefinitions(repositoryRoot);
const existingIds = new Set(
  definitions
    .map(({ className }) => parseCssClassName(className)?.id)
    .filter(Boolean),
);

let id;
do {
  const candidate = randomBytes(4).readUInt32BE(0) % 36 ** 6;
  id = candidate.toString(36).padStart(6, "0");
} while (existingIds.has(id));

console.log(`${scope}-${role}-${id}`);
