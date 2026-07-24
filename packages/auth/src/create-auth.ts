import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  appendAdminAuditEvent,
  appendSystemAuditEvent,
  provisionOwnerAdminSession,
} from "@shapewebs/database/admin-auth";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
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
  organizationId: string;
  onApiError?: () => Promise<void> | void;
  ownerEmails: string[];
  production: boolean;
  secret: string;
  trustedOrigins: string[];
};

function assertOrigin(
  value: string,
  label: string,
  requireHttps: boolean,
): void {
  const parsed = new URL(value);

  if (
    parsed.origin !== value ||
    parsed.hostname.includes("*") ||
    parsed.username ||
    parsed.password ||
    (requireHttps && parsed.protocol !== "https:") ||
    !["http:", "https:"].includes(parsed.protocol)
  ) {
    throw new Error(`${label} must be an exact HTTP(S) origin.`);
  }
}

export function createShapewebsAuth(options: ShapewebsAuthOptions) {
  if (options.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  assertOrigin(options.baseUrl, "BETTER_AUTH_URL", options.production);
  options.trustedOrigins.forEach((origin) =>
    assertOrigin(origin, "Better Auth trusted origin", options.production),
  );

  if (!options.trustedOrigins.includes(options.baseUrl)) {
    throw new Error(
      "Better Auth trusted origins must include BETTER_AUTH_URL.",
    );
  }

  if (options.production && !options.google) {
    throw new Error("Google OAuth must be configured in production.");
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      options.organizationId,
    )
  ) {
    throw new Error("SHAPEWEBS_ORGANIZATION_ID must be a UUID.");
  }

  const ownerEmails = new Set(
    options.ownerEmails.map((email) => email.trim().toLowerCase()),
  );

  if (ownerEmails.size === 0 || ownerEmails.has("")) {
    throw new Error("ADMIN_OWNER_EMAILS must contain at least one email.");
  }

  for (const email of ownerEmails) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("ADMIN_OWNER_EMAILS contains an invalid email address.");
    }
  }

  const database = createDatabase(options.databaseUrl);
  const assertAllowedEmail = (email: string) => {
    if (!ownerEmails.has(email.trim().toLowerCase())) {
      throw new APIError("FORBIDDEN", {
        message: "This account is not authorized for Shapewebs Admin.",
      });
    }
  };

  return betterAuth({
    account: {
      accountLinking: {
        allowDifferentEmails: false,
        trustedProviders: ["google"],
      },
      encryptOAuthTokens: true,
    },
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
    onAPIError: {
      errorURL: "/login?error=authentication",
      onError: async () => {
        await Promise.allSettled([
          appendSystemAuditEvent(options.databaseUrl, {
            action: "auth.api_failure",
            organizationId: options.organizationId,
            result: "failure",
            targetType: "authentication",
          }),
          Promise.resolve(options.onApiError?.()),
        ]);
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            assertAllowedEmail(newUser.email);

            return {
              data: {
                ...newUser,
                email: newUser.email.trim().toLowerCase(),
              },
            };
          },
        },
      },
      session: {
        create: {
          before: async (newSession) => {
            const [sessionUser] = await database
              .select({ email: authSchema.user.email })
              .from(authSchema.user)
              .where(eq(authSchema.user.id, newSession.userId))
              .limit(1);

            if (!sessionUser) {
              throw new APIError("UNAUTHORIZED");
            }

            assertAllowedEmail(sessionUser.email);
          },
          after: async (newSession) => {
            await provisionOwnerAdminSession(options.databaseUrl, {
              organizationId: options.organizationId,
              sessionId: newSession.id,
              userId: newSession.userId,
            });
          },
        },
        delete: {
          before: async (deletedSession) => {
            await appendAdminAuditEvent(options.databaseUrl, {
              action: "auth.session_deleted",
              organizationId: options.organizationId,
              result: "success",
              role: "owner",
              sessionId: deletedSession.id,
              targetId: deletedSession.id,
              targetType: "session",
              userId: deletedSession.userId,
            });
          },
        },
      },
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
      disableSessionRefresh: true,
      expiresIn: 60 * 60 * 8,
      freshAge: 60 * 5,
    },
    socialProviders: options.google
      ? {
          google: {
            clientId: options.google.clientId,
            clientSecret: options.google.clientSecret,
            disableImplicitSignUp: false,
            prompt: "select_account",
            scope: ["email", "profile"],
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
