import { defineConfig } from "drizzle-kit";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;

export default defineConfig({
  dialect: "postgresql",
  out: "../../drizzle",
  schema: "./src/schema/index.ts",
  strict: true,
  verbose: true,
  migrations: {
    schema: "drizzle",
    table: "__shapewebs_migrations",
  },
  ...(migrationUrl
    ? {
        dbCredentials: {
          url: migrationUrl,
        },
      }
    : {}),
});
