import assert from "node:assert/strict";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_MIGRATION_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL is required.");
}

const sql = neon(databaseUrl);

const [identity] = await sql`
  select
    current_user as current_user,
    (
      select count(*)::integer
      from drizzle.__shapewebs_migrations
    ) as migration_count
`;

assert.equal(identity.current_user, "shapewebs_migrator");
assert.equal(identity.migration_count, 6);

const [before] = await sql`
  select
    to_regnamespace('lifecycle_rollback_probe') as schema_name,
    to_regclass('lifecycle_rollback_probe.migration_probe') as table_name
`;

assert.equal(before.schema_name, null);
assert.equal(before.table_name, null);

let migrationFailed = false;

try {
  await sql.transaction([
    sql`create schema lifecycle_rollback_probe`,
    sql`create table lifecycle_rollback_probe.migration_probe (
      id integer primary key
    )`,
    sql`insert into lifecycle_rollback_probe.migration_probe (id) values (1)`,
    sql`select 1 / 0`,
  ]);
} catch {
  migrationFailed = true;
}

assert.equal(migrationFailed, true, "The synthetic migration must fail");

const [after] = await sql`
  select
    to_regnamespace('lifecycle_rollback_probe') as schema_name,
    to_regclass('lifecycle_rollback_probe.migration_probe') as table_name,
    (
      select count(*)::integer
      from drizzle.__shapewebs_migrations
    ) as migration_count
`;

assert.equal(
  after.schema_name,
  null,
  "The failed schema creation must roll back",
);
assert.equal(
  after.table_name,
  null,
  "The failed table creation must roll back",
);
assert.equal(
  after.migration_count,
  6,
  "The migration journal must be unchanged",
);

console.log(
  "Migration rollback verified: the failed transaction left no schema, table, or journal entry.",
);
