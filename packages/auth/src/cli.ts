import { createShapewebsAuth } from "./create-auth";

const placeholderSecret = "shapewebs-schema-generation-secret-only";

export const auth = createShapewebsAuth({
  baseUrl: "http://localhost:3001",
  databaseUrl:
    process.env.DATABASE_MIGRATION_URL ??
    "postgresql://schema:placeholder@localhost:5432/shapewebs",
  production: false,
  secret: process.env.BETTER_AUTH_SECRET ?? placeholderSecret,
  trustedOrigins: ["http://localhost:3001"],
});
