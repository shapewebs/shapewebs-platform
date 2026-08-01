import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { betterAuth } from "better-auth/minimal";
import { twoFactor } from "better-auth/plugins";

const placeholderSecret = "shapewebs-schema-generation-secret-only";
const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ??
  "postgresql://schema:placeholder@localhost:5432/shapewebs";

// Better Auth's schema CLI evaluates this file outside Next.js. Keep this
// schema-only configuration independent from the server-guarded runtime graph,
// and mirror every option that changes the generated database model.
export const auth = betterAuth({
  account: {
    encryptOAuthTokens: true,
  },
  appName: "Shapewebs",
  basePath: "/api/auth",
  baseURL: "http://localhost:3001",
  database: drizzleAdapter(createDatabase(databaseUrl), {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  plugins: [
    twoFactor({
      backupCodeOptions: {
        amount: 0,
      },
      issuer: "Shapewebs",
    }),
  ],
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  secret: process.env.BETTER_AUTH_SECRET ?? placeholderSecret,
  telemetry: {
    enabled: false,
  },
  trustedOrigins: ["http://localhost:3001"],
});
