import { createShapewebsAuth } from "./create-auth";

const placeholderSecret = "shapewebs-schema-generation-secret-only";

export const auth = createShapewebsAuth({
  baseUrl: "http://localhost:3001",
  databaseUrl:
    process.env.DATABASE_MIGRATION_URL ??
    "postgresql://schema:placeholder@localhost:5432/shapewebs",
  emailEncryptionSecret:
    process.env.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET ?? placeholderSecret,
  organizationId: "00000000-0000-4000-8000-000000000001",
  ownerEmails: ["schema@shapewebs.invalid"],
  production: false,
  secret: process.env.BETTER_AUTH_SECRET ?? placeholderSecret,
  trustedOrigins: ["http://localhost:3001"],
});
