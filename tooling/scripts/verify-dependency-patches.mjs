import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const braceExpansion = require("brace-expansion");

assert.equal(
  typeof braceExpansion,
  "function",
  "brace-expansion must retain the callable CommonJS API used by legacy minimatch releases.",
);
assert.equal(
  braceExpansion.expand,
  braceExpansion,
  "brace-expansion must expose the modern named expand API.",
);
assert.deepEqual(braceExpansion("a{1,2}"), ["a1", "a2"]);
assert.deepEqual(braceExpansion.expand("b{3,4}"), ["b3", "b4"]);
assert.equal(braceExpansion.EXPANSION_MAX_LENGTH, 4_000_000);

const boundedExpansion = braceExpansion("{a,b}".repeat(50), {
  max: 1_000,
  maxLength: 5_000,
});
const boundedLength = boundedExpansion.reduce(
  (total, value) => total + value.length,
  0,
);

assert.equal(
  boundedLength,
  5_000,
  "brace-expansion must enforce the patched aggregate output limit.",
);

console.log(
  "Dependency compatibility patch valid: legacy and modern brace-expansion APIs are bounded.",
);
