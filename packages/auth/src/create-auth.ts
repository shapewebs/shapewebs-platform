import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  appendAdminAuditEvent,
  appendSystemAuditEvent,
  enqueueAdminAuthEmail,
  provisionAdminSession,
} from "@shapewebs/database/admin-auth";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { emailAddressSchema } from "@shapewebs/validation";
import { eq } from "drizzle-orm";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { haveIBeenPwned, twoFactor } from "better-auth/plugins";

import {
  encryptAdminEmailToken,
  hashAdminEmailToken,
} from "./admin-email-token";
import { verifyAdminMethodAuthorization } from "./admin-method-authorization";
import { createVerifiedGoogleUserInfo } from "./google-user-info";
import { getAdminCookiePolicy } from "./cookie-policy";
import { generateAdminSessionToken } from "./session-cookie";

const disabledAuthPaths = [
  "/account-info",
  "/get-access-token",
  "/refresh-token",
  "/list-sessions",
  "/request-password-reset",
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/sign-up/email",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/two-factor/get-totp-uri",
  "/two-factor/send-otp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-otp",
  "/two-factor/verify-totp",
] as const;

export type GoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type ShapewebsAuthOptions = {
  baseUrl: string;
  databaseUrl: string;
  editorEmails?: string[];
  emailEncryptionSecret: string;
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

  if (options.emailEncryptionSecret.length < 32) {
    throw new Error(
      "ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET must contain at least 32 characters.",
    );
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
  const editorEmails = new Set(
    (options.editorEmails ?? []).map((email) => email.trim().toLowerCase()),
  );

  if (ownerEmails.size === 0 || ownerEmails.has("")) {
    throw new Error("ADMIN_OWNER_EMAILS must contain at least one email.");
  }

  for (const email of ownerEmails) {
    if (!emailAddressSchema.safeParse(email).success) {
      throw new Error("ADMIN_OWNER_EMAILS contains an invalid email address.");
    }
  }

  for (const email of editorEmails) {
    if (
      !email ||
      ownerEmails.has(email) ||
      !emailAddressSchema.safeParse(email).success
    ) {
      throw new Error(
        "ADMIN_EDITOR_EMAILS must contain unique valid emails that are not owners.",
      );
    }
  }

  const database = createDatabase(options.databaseUrl);
  const cookiePolicy = getAdminCookiePolicy(options.production);
  const assertAllowedEmail = (email: string): "editor" | "owner" => {
    const normalized = email.trim().toLowerCase();
    if (!ownerEmails.has(normalized) && !editorEmails.has(normalized)) {
      throw new APIError("FORBIDDEN", {
        message: "This account is not authorized for Shapewebs Admin.",
      });
    }

    return ownerEmails.has(normalized) ? "owner" : "editor";
  };

  return betterAuth({
    account: {
      accountLinking: {
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        disableImplicitLinking: true,
        trustedProviders: ["google"],
        updateUserInfoOnLink: false,
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
    disabledPaths: [...disabledAuthPaths],
    emailAndPassword: {
      autoSignIn: false,
      disableSignUp: false,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 15,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ token, user }) => {
        assertAllowedEmail(user.email);
        const tokenHash = await hashAdminEmailToken(token);
        await enqueueAdminAuthEmail(options.databaseUrl, {
          encryptedToken: await encryptAdminEmailToken(
            token,
            options.emailEncryptionSecret,
            60 * 60,
          ),
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
          idempotencyKey: `admin.password_reset/${tokenHash}`,
          kind: "password_reset",
          organizationId: options.organizationId,
          recipient: user.email.trim().toLowerCase(),
          tokenHash,
          userId: user.id,
        });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendOnSignUp: true,
      sendVerificationEmail: async ({ token, user }) => {
        assertAllowedEmail(user.email);
        const tokenHash = await hashAdminEmailToken(token);
        await enqueueAdminAuthEmail(options.databaseUrl, {
          encryptedToken: await encryptAdminEmailToken(
            token,
            options.emailEncryptionSecret,
            60 * 60,
          ),
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
          idempotencyKey: `admin.email_verification/${tokenHash}`,
          kind: "email_verification",
          organizationId: options.organizationId,
          recipient: user.email.trim().toLowerCase(),
          tokenHash,
          userId: user.id,
        });
      },
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
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path === "/link-social") {
          const activeSession = await getSessionFromCtx(context);
          const authorization =
            context.request?.headers.get("x-shapewebs-method-authorization") ??
            context.headers?.get("x-shapewebs-method-authorization");

          if (
            !activeSession ||
            !verifyAdminMethodAuthorization(
              authorization,
              options.secret,
              Date.now(),
              {
                sessionId: activeSession.session.id,
                userId: activeSession.user.id,
              },
            )
          ) {
            throw new APIError("FORBIDDEN", {
              message: "Recent administrative reauthentication is required.",
            });
          }
          return;
        }

        if (context.path !== "/two-factor/enable") {
          return;
        }

        const activeSession = await getSessionFromCtx(context);

        if (activeSession?.user.twoFactorEnabled) {
          throw new APIError("FORBIDDEN", {
            message:
              "The enrolled administrative factor cannot be replaced through this endpoint.",
          });
        }
      }),
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

            return {
              data: {
                ...newSession,
                token: generateAdminSessionToken(),
              },
            };
          },
          after: async (newSession) => {
            const [sessionUser] = await database
              .select({ email: authSchema.user.email })
              .from(authSchema.user)
              .where(eq(authSchema.user.id, newSession.userId))
              .limit(1);

            if (!sessionUser) {
              throw new APIError("UNAUTHORIZED");
            }

            await provisionAdminSession(options.databaseUrl, {
              organizationId: options.organizationId,
              role: assertAllowedEmail(sessionUser.email),
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
        "/request-password-reset": {
          max: 3,
          window: 60,
        },
        "/reset-password": {
          max: 5,
          window: 60,
        },
        "/sign-in/email": {
          max: 5,
          window: 60,
        },
        "/sign-in/social": {
          max: 10,
          window: 60,
        },
        "/sign-up/email": {
          max: 3,
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
            getUserInfo: createVerifiedGoogleUserInfo(options.google.clientId),
            prompt: "select_account",
            scope: ["email", "profile"],
          },
        }
      : {},
    trustedOrigins: options.trustedOrigins,
    advanced: {
      cookiePrefix: cookiePolicy.prefix,
      defaultCookieAttributes: cookiePolicy.attributes,
      useSecureCookies: false,
    },
    plugins: [
      haveIBeenPwned({
        paths: ["/reset-password", "/sign-up/email"],
      }),
      twoFactor({
        allowPasswordless: true,
        backupCodeOptions: {
          amount: 0,
        },
        issuer: "Shapewebs",
      }),
    ],
    telemetry: {
      enabled: false,
    },
  });
}
