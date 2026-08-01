import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectId = process.env.NEON_NONPRODUCTION_PROJECT_ID;
const expectedProjectName =
  process.env.NEON_EXPECTED_PROJECT_NAME ?? "shapewebs-platform";
const expectedRegion = process.env.NEON_EXPECTED_REGION ?? "aws-eu-central-1";
const expectedOrganizationId = process.env.NEON_EXPECTED_ORGANIZATION_ID;
const neonctl = process.env.NEONCTL_BIN ?? "neonctl";
const customerRuntimePassword = process.env.NEON_CUSTOMER_RUNTIME_PASSWORD;

if (!projectId) {
  throw new Error("NEON_NONPRODUCTION_PROJECT_ID is required.");
}

if (!expectedOrganizationId) {
  throw new Error("NEON_EXPECTED_ORGANIZATION_ID is required.");
}

if (!customerRuntimePassword) {
  throw new Error("NEON_CUSTOMER_RUNTIME_PASSWORD is required.");
}

if (!/^[A-Za-z0-9_-]{43}$/.test(customerRuntimePassword)) {
  throw new Error("NEON_CUSTOMER_RUNTIME_PASSWORD has an invalid format.");
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = dirname(scriptDirectory);
const repositoryRoot = resolve(packageDirectory, "..", "..");
const fixtureScript = join(scriptDirectory, "lifecycle-fixture.mjs");
const rollbackScript = join(scriptDirectory, "verify-migration-rollback.mjs");
const securityScript = join(scriptDirectory, "verify-security.mjs");
const unifiedIdentityScript = join(
  scriptDirectory,
  "verify-unified-identity-migration.mjs",
);
const temporaryDirectory = mkdtempSync(
  join(tmpdir(), "shapewebs-neon-lifecycle-"),
);
const exportPath = join(temporaryDirectory, "synthetic-fixture.json");
const restoredExportPath = join(
  temporaryDirectory,
  "restored-synthetic-fixture.json",
);
const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
const sourceBranchName = `codex-lifecycle-source-${suffix}`;
const restoreBranchName = `codex-lifecycle-restore-${suffix}`;
const identityBranchName = `codex-identity-source-${suffix}`;
const conflictBranchName = `codex-identity-conflict-${suffix}`;
const databaseName = `shapewebs_lifecycle_${suffix}`;
const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

let sourceBranchId;
let restoreBranchId;
let identityBranchId;
let conflictBranchId;
let parentBranchId;
let primaryFailure;

const preUnifiedMigrationsDirectory = join(
  temporaryDirectory,
  "pre-unified-migrations",
);
const preUnifiedConfigPath = join(
  temporaryDirectory,
  "drizzle.pre-unified.config.ts",
);

class CommandExecutionError extends Error {
  constructor(command, args, result) {
    super(`${command} ${args.join(" ")} exited with status ${result.status}`);
    this.name = "CommandExecutionError";
    this.stderr = result.stderr?.trim() ?? "";
    this.stdout = result.stdout?.trim() ?? "";
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
    },
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    if (options.capture) {
      if (result.stdout) {
        process.stderr.write(result.stdout);
      }
      if (result.stderr) {
        process.stderr.write(result.stderr);
      }
    }
    throw new CommandExecutionError(command, args, result);
  }

  return result.stdout?.trim() ?? "";
}

function wait(milliseconds) {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)),
    0,
    0,
    milliseconds,
  );
}

function isRetryableNeonConflict(error) {
  return (
    error instanceof CommandExecutionError &&
    /conflicting operations|resource is locked/i.test(
      `${error.stderr}\n${error.stdout}`,
    )
  );
}

function runNeon(args) {
  const maximumAttempts = 5;
  let output;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      output = run(
        neonctl,
        [...args, "--output", "json", "--no-color", "--no-analytics"],
        { capture: true },
      );
      break;
    } catch (error) {
      if (!isRetryableNeonConflict(error) || attempt === maximumAttempts) {
        if (error instanceof CommandExecutionError && error.stderr) {
          process.stderr.write(`${error.stderr}\n`);
        }
        throw error;
      }

      const retryDelayMs = Math.min(2_000 * 2 ** (attempt - 1), 10_000);
      console.warn(
        `Neon has a conflicting operation; retrying in ${retryDelayMs}ms (${attempt}/${maximumAttempts}).`,
      );
      wait(retryDelayMs);
    }
  }

  if (output === undefined || !["{", "[", '"'].includes(output[0])) {
    return output ?? "";
  }

  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Neon CLI returned malformed structured output.");
  }
}

function listBranches() {
  const branches = runNeon(["branches", "list", "--project-id", projectId]);
  assert.equal(Array.isArray(branches), true);
  return branches;
}

function branchFromResponse(response) {
  const branch = response.branch ?? response;
  assert.equal(typeof branch?.id, "string");
  assert.equal(typeof branch?.name, "string");
  return branch;
}

function createBranch(name) {
  const response = runNeon([
    "branches",
    "create",
    "--project-id",
    projectId,
    "--name",
    name,
    "--parent",
    parentBranchId,
    "--expires-at",
    expiresAt,
  ]);
  const branch = branchFromResponse(response);
  assert.equal(branch.name, name);
  assert.notEqual(branch.id, parentBranchId);
  console.log(`Created disposable Neon branch ${name} (${branch.id}).`);
  return branch.id;
}

function createDatabase(branchId) {
  runNeon([
    "databases",
    "create",
    "--project-id",
    projectId,
    "--branch",
    branchId,
    "--name",
    databaseName,
    "--owner-name",
    "shapewebs_migrator",
  ]);
  console.log(`Created fresh database ${databaseName} on ${branchId}.`);
}

function connectionString(branchId, roleName, pooled = false) {
  const args = [
    "connection-string",
    branchId,
    "--project-id",
    projectId,
    "--role-name",
    roleName,
    "--database-name",
    databaseName,
  ];

  if (pooled) {
    args.push("--pooled");
  }

  const response = runNeon(args);
  assert.equal(typeof response, "string");
  const parsed = new URL(response);
  assert.equal(parsed.username, roleName);
  assert.equal(parsed.pathname, `/${databaseName}`);
  assert.equal(parsed.password.length > 0, true);
  assert.equal(
    parsed.hostname.includes("-pooler."),
    pooled,
    `${roleName} connection pool mode is incorrect`,
  );
  return response;
}

function connectionsFor(branchId) {
  const adminUrl = connectionString(branchId, "shapewebs_admin_runtime", true);
  const customerUrl = new URL(adminUrl);
  customerUrl.username = "shapewebs_portal_runtime";
  customerUrl.password = customerRuntimePassword;

  return {
    DATABASE_OWNER_URL: connectionString(branchId, "shapewebs_owner"),
    DATABASE_MIGRATION_URL: connectionString(branchId, "shapewebs_migrator"),
    DATABASE_ADMIN_URL: adminUrl,
    DATABASE_CUSTOMER_URL: customerUrl.toString(),
    DATABASE_WEB_URL: connectionString(branchId, "shapewebs_web_runtime", true),
    DATABASE_PUBLIC_URL: connectionString(
      branchId,
      "shapewebs_public_reader",
      true,
    ),
  };
}

function migrate(connections) {
  run("corepack", ["pnpm", "--filter", "@shapewebs/database", "db:migrate"], {
    capture: true,
    env: {
      DATABASE_MIGRATION_URL: connections.DATABASE_MIGRATION_URL,
    },
  });
}

function preparePreUnifiedMigrations() {
  const sourceDirectory = join(repositoryRoot, "drizzle");
  const sourceJournalPath = join(sourceDirectory, "meta", "_journal.json");
  const sourceJournal = JSON.parse(readFileSync(sourceJournalPath, "utf8"));
  const entries = sourceJournal.entries.filter((entry) => entry.idx <= 18);

  assert.equal(entries.length, 19, "Expected migrations 0000 through 0018");
  assert.equal(entries.at(-1)?.tag, "0018_preview-session-transition");

  // This bounded directory is created beneath this process's private mkdtemp.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(join(preUnifiedMigrationsDirectory, "meta"), { recursive: true });
  for (const entry of entries) {
    copyFileSync(
      join(sourceDirectory, `${entry.tag}.sql`),
      join(preUnifiedMigrationsDirectory, `${entry.tag}.sql`),
    );
  }

  // This bounded file is written beneath this process's private mkdtemp.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(
    join(preUnifiedMigrationsDirectory, "meta", "_journal.json"),
    `${JSON.stringify({ ...sourceJournal, entries }, null, 2)}\n`,
    { mode: 0o600 },
  );
  // This bounded file is written beneath this process's private mkdtemp.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(
    preUnifiedConfigPath,
    `const migrationUrl = process.env.DATABASE_MIGRATION_URL;
if (!migrationUrl) throw new Error("DATABASE_MIGRATION_URL is required.");
export default ${JSON.stringify(
      {
        dialect: "postgresql",
        out: preUnifiedMigrationsDirectory,
        migrations: {
          schema: "drizzle",
          table: "__shapewebs_migrations",
        },
        dbCredentials: { url: "__DATABASE_MIGRATION_URL__" },
      },
      null,
      2,
    ).replace('"__DATABASE_MIGRATION_URL__"', "migrationUrl")};\n`,
    { mode: 0o600 },
  );
}

function migrateThrough0018(connections) {
  run(
    "corepack",
    [
      "pnpm",
      "--filter",
      "@shapewebs/database",
      "exec",
      "drizzle-kit",
      "migrate",
      "--config",
      preUnifiedConfigPath,
    ],
    {
      env: {
        DATABASE_MIGRATION_URL: connections.DATABASE_MIGRATION_URL,
      },
    },
  );
}

function expectUnifiedMigrationFailure(connections) {
  try {
    migrate(connections);
  } catch (error) {
    assert.ok(error instanceof CommandExecutionError);
    return;
  }

  assert.fail("The ambiguous identity migration unexpectedly succeeded");
}

function runDatabaseScript(script, args, connections, extraEnvironment = {}) {
  run(process.execPath, [script, ...args], {
    env: {
      ...connections,
      ...extraEnvironment,
    },
  });
}

function deleteBranch(branchId, name) {
  assert.notEqual(branchId, parentBranchId);
  runNeon(["branches", "delete", branchId, "--project-id", projectId]);
  console.log(`Deleted disposable Neon branch ${name} (${branchId}).`);
}

function cleanNamedBranches() {
  const targets = new Set([
    sourceBranchName,
    restoreBranchName,
    identityBranchName,
    conflictBranchName,
  ]);
  const branches = listBranches();

  for (const branch of branches) {
    if (targets.has(branch.name)) {
      assert.notEqual(branch.id, parentBranchId);
      deleteBranch(branch.id, branch.name);
    }
  }
}

try {
  const projectResponse = runNeon(["projects", "get", projectId]);
  const project = projectResponse.project ?? projectResponse;

  assert.ok(project, "The configured Neon project was not found");
  assert.equal(project.id, projectId);
  assert.equal(project.name, expectedProjectName);
  assert.equal(project.region_id, expectedRegion);
  assert.equal(project.org_id, expectedOrganizationId);

  const initialBranches = listBranches();
  const parentBranch = initialBranches.find(
    (branch) => branch.name === "main" && branch.default && branch.primary,
  );

  assert.ok(parentBranch, "The non-production default branch was not found");
  parentBranchId = parentBranch.id;
  assert.equal(
    initialBranches.some((branch) =>
      [
        sourceBranchName,
        restoreBranchName,
        identityBranchName,
        conflictBranchName,
      ].includes(branch.name),
    ),
    false,
    "A generated lifecycle branch name already exists",
  );

  preparePreUnifiedMigrations();

  identityBranchId = createBranch(identityBranchName);
  createDatabase(identityBranchId);
  const identityConnections = connectionsFor(identityBranchId);
  migrateThrough0018(identityConnections);
  runDatabaseScript(
    unifiedIdentityScript,
    ["seed-success"],
    identityConnections,
  );
  try {
    migrate(identityConnections);
  } catch {
    runDatabaseScript(
      unifiedIdentityScript,
      ["diagnose-unified-migration"],
      identityConnections,
    );
    assert.fail("The migration diagnostic unexpectedly returned");
  }
  runDatabaseScript(
    unifiedIdentityScript,
    ["verify-success"],
    identityConnections,
  );
  runDatabaseScript(securityScript, [], identityConnections);

  conflictBranchId = createBranch(conflictBranchName);
  createDatabase(conflictBranchId);
  const conflictConnections = connectionsFor(conflictBranchId);
  migrateThrough0018(conflictConnections);
  runDatabaseScript(
    unifiedIdentityScript,
    ["seed-conflict"],
    conflictConnections,
  );
  expectUnifiedMigrationFailure(conflictConnections);
  runDatabaseScript(
    unifiedIdentityScript,
    ["verify-conflict-rejection"],
    conflictConnections,
  );
  runDatabaseScript(
    unifiedIdentityScript,
    ["verify-conflict-rollback"],
    conflictConnections,
  );

  sourceBranchId = createBranch(sourceBranchName);
  createDatabase(sourceBranchId);
  const sourceConnections = connectionsFor(sourceBranchId);
  migrate(sourceConnections);
  runDatabaseScript(fixtureScript, ["seed"], sourceConnections);
  run("corepack", ["pnpm", "test:database:content-list"], {
    env: sourceConnections,
  });
  runDatabaseScript(securityScript, [], sourceConnections);
  runDatabaseScript(rollbackScript, [], sourceConnections);
  runDatabaseScript(fixtureScript, ["export"], sourceConnections, {
    LIFECYCLE_EXPORT_PATH: exportPath,
  });

  // Both files contain synthetic example.test data only.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const sourceExport = readFileSync(exportPath, "utf8");
  const sourceHashMatch = sourceExport.match(/"version": 6/);
  assert.ok(sourceHashMatch, "The logical export is invalid");

  restoreBranchId = createBranch(restoreBranchName);
  createDatabase(restoreBranchId);
  const restoreConnections = connectionsFor(restoreBranchId);
  migrate(restoreConnections);
  runDatabaseScript(fixtureScript, ["restore"], restoreConnections, {
    LIFECYCLE_EXPORT_PATH: exportPath,
  });
  run("corepack", ["pnpm", "test:database:content-list"], {
    env: restoreConnections,
  });
  runDatabaseScript(securityScript, [], restoreConnections);
  runDatabaseScript(fixtureScript, ["export"], restoreConnections, {
    LIFECYCLE_EXPORT_PATH: restoredExportPath,
  });

  // Both files contain synthetic example.test data only.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const restoredExport = readFileSync(restoredExportPath, "utf8");
  assert.equal(
    restoredExport,
    sourceExport,
    "The restored logical export differs from the source",
  );

  console.log(
    "Neon lifecycle verified: fresh migrations, deterministic fixtures, authorization, rollback, and logical restore all passed.",
  );
} catch (error) {
  primaryFailure = error;
} finally {
  try {
    if (parentBranchId) {
      cleanNamedBranches();
      const remainingNames = new Set(
        listBranches().map((branch) => branch.name),
      );
      assert.equal(remainingNames.has(sourceBranchName), false);
      assert.equal(remainingNames.has(restoreBranchName), false);
      assert.equal(remainingNames.has(identityBranchName), false);
      assert.equal(remainingNames.has(conflictBranchName), false);
    }
  } catch (cleanupError) {
    primaryFailure = primaryFailure
      ? new AggregateError(
          [primaryFailure, cleanupError],
          "Lifecycle verification and cleanup both failed",
        )
      : cleanupError;
  }

  // This directory was created by this process and contains synthetic data only.
  rmSync(temporaryDirectory, { recursive: true, force: true });
}

if (primaryFailure) {
  throw primaryFailure;
}
