import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { format } from "prettier";

const checkOnly = process.argv.includes("--check");
const catalogPath = "assurance/asvs/catalog-index.json";
const evidencePath = "assurance/asvs/evidence.json";
const lockPath = "assurance/asvs/catalog.lock.json";
const reviewsPath = "assurance/asvs/reviews.json";
const lock = JSON.parse(await readFile(lockPath, "utf8"));
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const reviews = JSON.parse(await readFile(reviewsPath, "utf8"));

if (
  lock.version !== "5.0.0" ||
  catalog.version !== lock.version ||
  reviews.version !== lock.version ||
  !Array.isArray(catalog.requirements) ||
  !Array.isArray(reviews.requirements)
) {
  throw new Error("The ASVS catalog, lock and reviews versions do not match.");
}

const targetRequirements = catalog.requirements.filter(
  (requirement) => requirement.level <= 2,
);
const targetIds = new Set(
  targetRequirements.map((requirement) => requirement.id),
);
const reviewsById = new Map();

for (const review of reviews.requirements) {
  if (
    !targetIds.has(review.id) ||
    review.disposition === "unreviewed" ||
    reviewsById.has(review.id)
  ) {
    throw new Error(`The ASVS review ${review.id} is invalid or duplicated.`);
  }

  reviewsById.set(review.id, review);
}

const evidence = {
  requirements: targetRequirements.map((requirement) => {
    return (
      reviewsById.get(requirement.id) ?? {
        disposition: "unreviewed",
        evidence: [],
        id: requirement.id,
        owner: "Shapewebs owner",
      }
    );
  }),
  target: {
    authenticatedAndStateful: "L2",
    staticPublic: "L1",
  },
  version: lock.version,
};
const evidenceText = await format(JSON.stringify(evidence), {
  filepath: evidencePath,
});

if (checkOnly) {
  const currentEvidenceText = await readFile(evidencePath, "utf8");
  const currentEvidence = JSON.parse(currentEvidenceText);

  if (
    currentEvidenceText !== evidenceText ||
    !isDeepStrictEqual(currentEvidence, evidence)
  ) {
    throw new Error(
      "The generated ASVS evidence register is stale. Run pnpm security:asvs:generate.",
    );
  }
} else {
  await writeFile(evidencePath, evidenceText);
}

console.log(
  `${checkOnly ? "Verified" : "Generated"} ${evidence.requirements.length} ` +
    `ASVS L1/L2 evidence records from ${reviewsById.size} reviews.`,
);
