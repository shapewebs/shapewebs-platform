import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const outputPath = fileURLToPath(
  new URL("../../database/src/schema/auth.ts", import.meta.url),
);
const checkOnly = process.argv.includes("--check");
// The path is fixed relative to this checked-in script.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const original = checkOnly ? readFileSync(outputPath, "utf8") : null;

try {
  const result = spawnSync(
    "auth",
    [
      "generate",
      "--config",
      "src/cli.ts",
      "--output",
      "../database/src/schema/auth.ts",
      "--yes",
    ],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  } else {
    // The path is fixed relative to this checked-in script.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const generated = readFileSync(outputPath, "utf8");
    const importMarker = '} from "drizzle-orm/pg-core";\n';

    if (!generated.includes("pgTable") || !generated.includes(importMarker)) {
      throw new Error("Unexpected Better Auth Drizzle schema output.");
    }

    const namespaced = generated
      .replace(/\bpgTable,\n/, "pgSchema,\n")
      .replace(
        '  index,\n} from "drizzle-orm/pg-core";',
        '  index,\n  uniqueIndex,\n} from "drizzle-orm/pg-core";',
      )
      .replace(/\bpgTable\(/g, "authSchema.table(")
      .replace(
        'index("passkey_credentialID_idx").on(table.credentialID)',
        'uniqueIndex("passkey_credentialID_unique").on(table.credentialID)',
      )
      .replace(
        importMarker,
        `${importMarker}\nexport const authSchema = pgSchema("auth");\n`,
      );

    if (checkOnly && namespaced !== original) {
      throw new Error(
        "The checked-in Better Auth schema is stale. Run pnpm --filter @shapewebs/auth auth:schema.",
      );
    }

    if (!checkOnly) {
      // The path is fixed relative to this checked-in script.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      writeFileSync(outputPath, namespaced);
    }
  }
} finally {
  if (checkOnly && original !== null) {
    // Restore the exact original bytes so verification never dirties the worktree.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    writeFileSync(outputPath, original);
  }
}
