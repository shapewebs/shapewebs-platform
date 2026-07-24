import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const outputPath = fileURLToPath(
  new URL("../../database/src/schema/auth.ts", import.meta.url),
);

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
  process.exit(result.status ?? 1);
}

// The path is fixed relative to this checked-in script.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const generated = readFileSync(outputPath, "utf8");
const importMarker = '} from "drizzle-orm/pg-core";\n';

if (!generated.includes("pgTable") || !generated.includes(importMarker)) {
  throw new Error("Unexpected Better Auth Drizzle schema output.");
}

const namespaced = generated
  .replace(/\bpgTable,\n/, "pgSchema,\n")
  .replace(/\bpgTable\(/g, "authSchema.table(")
  .replace(
    importMarker,
    `${importMarker}\nexport const authSchema = pgSchema("auth");\n`,
  );

// The path is fixed relative to this checked-in script.
// eslint-disable-next-line security/detect-non-literal-fs-filename
writeFileSync(outputPath, namespaced);
