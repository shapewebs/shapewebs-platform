import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const launchGate = process.argv.includes("--launch-gate");
const dispositions = new Set([
  "accepted_risk",
  "implemented",
  "manual",
  "not_applicable",
  "unreviewed",
]);
const requirementIdPattern = /^v5\.0\.0-\d+\.\d+\.\d+$/;
const lock = JSON.parse(
  await readFile("assurance/asvs/catalog.lock.json", "utf8"),
);
const catalogText = await readFile("assurance/asvs/catalog-index.json", "utf8");
const catalog = JSON.parse(catalogText);
const register = JSON.parse(
  await readFile("assurance/asvs/evidence.json", "utf8"),
);

if (
  lock.version !== "5.0.0" ||
  catalog.version !== lock.version ||
  register.version !== lock.version ||
  catalog.generatedFrom?.sourceSha256 !== lock.sourceSha256 ||
  createHash("sha256").update(catalogText).digest("hex") !==
    lock.catalogIndexSha256
) {
  throw new Error("The ASVS catalog, lock and evidence versions do not match.");
}

const catalogIds = new Set();

for (const requirement of catalog.requirements) {
  if (
    !requirementIdPattern.test(requirement.id) ||
    !Number.isInteger(requirement.level) ||
    requirement.level < 1 ||
    requirement.level > 3 ||
    typeof requirement.chapterId !== "string" ||
    typeof requirement.chapterName !== "string" ||
    typeof requirement.sectionId !== "string" ||
    typeof requirement.sectionName !== "string" ||
    catalogIds.has(requirement.id)
  ) {
    throw new Error("The generated ASVS catalog index is invalid.");
  }
  catalogIds.add(requirement.id);
}

const targetIds = new Set(
  catalog.requirements
    .filter((requirement) => requirement.level <= 2)
    .map((requirement) => requirement.id),
);
const registerIds = new Set();
const counts = Object.fromEntries(
  [...dispositions].map((disposition) => [disposition, 0]),
);
const today = new Date().toISOString().slice(0, 10);

for (const requirement of register.requirements) {
  if (
    !targetIds.has(requirement.id) ||
    registerIds.has(requirement.id) ||
    !dispositions.has(requirement.disposition) ||
    !Array.isArray(requirement.evidence) ||
    typeof requirement.owner !== "string" ||
    requirement.owner.trim().length === 0
  ) {
    throw new Error(`The ASVS evidence record ${requirement.id} is invalid.`);
  }
  registerIds.add(requirement.id);
  counts[requirement.disposition] += 1;

  if (
    ["implemented", "manual"].includes(requirement.disposition) &&
    requirement.evidence.length === 0
  ) {
    throw new Error(`${requirement.id} requires evidence.`);
  }

  if (
    requirement.disposition === "not_applicable" &&
    (typeof requirement.notes !== "string" ||
      requirement.notes.trim().length === 0)
  ) {
    throw new Error(`${requirement.id} requires a not-applicable rationale.`);
  }

  if (requirement.disposition === "accepted_risk") {
    if (
      requirement.evidence.length === 0 ||
      typeof requirement.notes !== "string" ||
      requirement.notes.trim().length === 0 ||
      typeof requirement.expiresOn !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(requirement.expiresOn) ||
      requirement.expiresOn <= today
    ) {
      throw new Error(
        `${requirement.id} requires evidence, rationale and a future risk expiry.`,
      );
    }
  }
}

if (
  registerIds.size !== targetIds.size ||
  [...targetIds].some((id) => !registerIds.has(id))
) {
  throw new Error(
    `The ASVS register covers ${registerIds.size} of ${targetIds.size} target requirements.`,
  );
}

if (launchGate && counts.unreviewed > 0) {
  throw new Error(
    `ASVS launch gate failed: ${counts.unreviewed} requirements remain unreviewed.`,
  );
}

console.log(
  `ASVS evidence valid: ${targetIds.size} L1/L2 requirements; ` +
    `${targetIds.size - counts.unreviewed} reviewed; ` +
    `${counts.unreviewed} unreviewed.`,
);
