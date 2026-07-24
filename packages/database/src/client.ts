import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

function assertDatabaseUrl(databaseUrl: string): void {
  let parsed: URL;

  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error("Database connection URL is invalid.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Database connection URL must use PostgreSQL.");
  }

  if (!parsed.hostname || !parsed.username || !parsed.pathname.slice(1)) {
    throw new Error("Database connection URL is incomplete.");
  }
}

export function createDatabase(databaseUrl: string) {
  assertDatabaseUrl(databaseUrl);

  const client = neon(databaseUrl);

  return drizzle({
    client,
    schema,
  });
}

export type ShapewebsDatabase = ReturnType<typeof createDatabase>;
