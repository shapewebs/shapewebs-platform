import { sql } from "drizzle-orm";

import { createDatabase } from "./client";

export async function pingDatabase(databaseUrl: string): Promise<void> {
  const database = createDatabase(databaseUrl);
  await database.execute(sql`select 1`);
}
