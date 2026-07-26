import { pgRole } from "drizzle-orm/pg-core";

export const adminRuntimeRole = pgRole("shapewebs_admin_runtime").existing();
export const migratorRole = pgRole("shapewebs_migrator").existing();
export const portalRuntimeRole = pgRole("shapewebs_portal_runtime").existing();
export const publicReaderRole = pgRole("shapewebs_public_reader").existing();
export const webRuntimeRole = pgRole("shapewebs_web_runtime").existing();
