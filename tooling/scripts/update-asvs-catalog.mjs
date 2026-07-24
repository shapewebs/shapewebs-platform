import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceArgument = process.argv
  .slice(2)
  .find((argument) => argument !== "--");

if (!sourceArgument) {
  throw new Error(
    "Usage: node tooling/scripts/update-asvs-catalog.mjs <downloaded-flat-json>",
  );
}

const lock = JSON.parse(
  await readFile("assurance/asvs/catalog.lock.json", "utf8"),
);
const sourcePath = path.resolve(sourceArgument);
// The operator-selected file is accepted only after its bytes match the
// reviewed SHA-256 lock below.
const sourceBytes = await readFile(sourcePath);
const sourceDigest = createHash("sha256").update(sourceBytes).digest("hex");

if (sourceDigest !== lock.sourceSha256) {
  throw new Error(
    `ASVS source digest ${sourceDigest} does not match the reviewed lock.`,
  );
}

const source = JSON.parse(sourceBytes.toString("utf8"));

if (!Array.isArray(source.requirements)) {
  throw new Error("The pinned ASVS source does not contain requirements.");
}

const requirementIdPattern = /^V(\d+\.\d+\.\d+)$/;
const seenIds = new Set();
const requirements = source.requirements.map((requirement) => {
  const match = requirementIdPattern.exec(requirement.req_id);
  const level = Number(requirement.L);

  if (
    !match ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > 3 ||
    typeof requirement.chapter_id !== "string" ||
    typeof requirement.chapter_name !== "string" ||
    typeof requirement.section_id !== "string" ||
    typeof requirement.section_name !== "string"
  ) {
    throw new Error("The pinned ASVS source has an unexpected requirement.");
  }

  const id = `v${lock.version}-${match[1]}`;

  if (seenIds.has(id)) {
    throw new Error(`The pinned ASVS source repeats ${id}.`);
  }
  seenIds.add(id);

  return {
    chapterId: requirement.chapter_id,
    chapterName: requirement.chapter_name,
    id,
    level,
    sectionId: requirement.section_id,
    sectionName: requirement.section_name,
  };
});

const catalog = {
  generatedFrom: {
    asset: lock.asset,
    releaseTag: lock.releaseTag,
    sourceSha256: lock.sourceSha256,
  },
  requirements,
  version: lock.version,
};
const catalogText = `${JSON.stringify(catalog, null, 2)}\n`;
const catalogDigest = createHash("sha256").update(catalogText).digest("hex");

if (catalogDigest !== lock.catalogIndexSha256) {
  throw new Error(
    `Generated ASVS index digest ${catalogDigest} does not match the reviewed lock.`,
  );
}
const targetIds = new Set(
  requirements
    .filter((requirement) => requirement.level <= 2)
    .map((requirement) => requirement.id),
);
let previousEvidence = new Map();

try {
  const existing = JSON.parse(
    await readFile("assurance/asvs/evidence.json", "utf8"),
  );
  previousEvidence = new Map(
    existing.requirements.map((requirement) => [requirement.id, requirement]),
  );
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }
}

const evidence = {
  requirements: requirements
    .filter((requirement) => targetIds.has(requirement.id))
    .map((requirement) => {
      const existing = previousEvidence.get(requirement.id);

      return (
        existing ?? {
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

await writeFile("assurance/asvs/catalog-index.json", catalogText);
await writeFile(
  "assurance/asvs/evidence.json",
  `${JSON.stringify(evidence, null, 2)}\n`,
);

console.log(
  `Generated ${requirements.length} ASVS requirements and ${evidence.requirements.length} L1/L2 evidence records.`,
);
