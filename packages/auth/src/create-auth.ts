import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { betterAuth } from "better-auth/minimal";
import { twoFactor } from "better-auth/plugins";

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type ShapewebsAuthOptions = {
  baseUrl: string;
  databaseUrl: string;
  google?: GoogleOAuthCredentials;
  production: boolean;
  secret: string;
  trustedOrigins: string[];
};

function assertOrigin(value: string, label: string): void {
  const parsed = new URL(value);

  if (
    parsed.origin !== value ||
    !["http:", "https:"].includes(parsed.protocol)
  ) {
    throw new Error(`${label} must be an exact HTTP(S) origin.`);
  }
}

export function createShapewebsAuth(options: ShapewebsAuthOptions) {
  if (options.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  assertOrigin(options.baseUrl, "BETTER_AUTH_URL");
  options.trustedOrigins.forEach((origin) =>
    assertOrigin(origin, "Better Auth trusted origin"),
  );

  const database = createDatabase(options.databaseUrl);

  return betterAuth({
    appName: "Shapewebs",
    basePath: "/api/auth",
    baseURL: options.baseUrl,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
    }),
    disabledPaths: ["/sign-in/email", "/sign-up/email"],
    emailAndPassword: {
      enabled: false,
    },
    rateLimit: {
      enabled: true,
      max: 60,
      storage: "database",
      window: 60,
      customRules: {
        "/sign-in/social": {
          max: 10,
          window: 60,
        },
      },
    },
    secret: options.secret,
    session: {
      expiresIn: 60 * 60 * 8,
      freshAge: 60 * 5,
      updateAge: 60 * 60,
    },
    socialProviders: options.google
      ? {
          google: {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
            prompt: "select_account",
          },
        }
      : {},
    trustedOrigins: options.trustedOrigins,
    advanced: {
      cookiePrefix: "shapewebs",
      defaultCookieAttributes: {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: options.production,
      },
      useSecureCookies: options.production,
    },
    plugins: [
      twoFactor({
        allowPasswordless: true,
        issuer: "Shapewebs",
      }),
    ],
    telemetry: {
      enabled: false,
    },
  });
}
