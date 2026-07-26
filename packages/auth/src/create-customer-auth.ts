import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  acceptCustomerGoogleInvitation,
  customerHasActiveMembership,
  customerRegistrationGrantMatches,
  enqueueCustomerAuthEmail,
  provisionCustomerSessionSecurity,
} from "@shapewebs/database/customer-auth";
import * as customerAuthSchema from "@shapewebs/database/customer-auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { emailAddressSchema } from "@shapewebs/validation";
import type { GenericEndpointContext } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { haveIBeenPwned } from "better-auth/plugins";

import {
  getCustomerCookiePolicy,
  readCustomerRegistrationGrant,
} from "./customer-cookie";
import { createVerifiedGoogleUserInfo } from "./google-user-info";
import {
  encryptCustomerEmailToken,
  generateCustomerBearerToken,
  hashCustomerBearerToken,
  hashCustomerOpaqueToken,
  isCustomerBearerToken,
} from "./customer-tokens";
import { verifyCustomerMethodAuthorization } from "./customer-method-authorization";

const customerSessionLifetimeSeconds = 7 * 24 * 60 * 60;
const passwordResetLifetimeSeconds = 60 * 60;
const customerBetterAuthSchema = {
  account: customerAuthSchema.customerAccount,
  rateLimit: customerAuthSchema.customerRateLimit,
  session: customerAuthSchema.customerSession,
  user: customerAuthSchema.customerUser,
  verification: customerAuthSchema.customerVerification,
};
const disabledCustomerAuthPaths = [
  "/account-info",
  "/change-password",
  "/change-email",
  "/delete-user",
  "/get-access-token",
  "/list-accounts",
  "/list-sessions",
  "/refresh-token",
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/send-verification-email",
  "/set-password",
  "/sign-up/email",
  "/unlink-account",
  "/update-user",
  "/verify-email",
] as const;

export type CustomerGoogleOAuthCredentials = {
  clientId: string;
  clientSecret: string;
};

export type ShapewebsCustomerAuthOptions = {
  baseUrl: string;
  databaseUrl: string;
  emailEncryptionSecret: string;
  google?: CustomerGoogleOAuthCredentials;
  onApiError?: () => Promise<void> | void;
  organizationId: string;
  production: boolean;
  secret: string;
  trustedOrigins: string[];
};

function assertCustomerOrigin(
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

function isGoogleCallback(context: GenericEndpointContext | null): boolean {
  if (!context?.request) {
    return false;
  }

  try {
    return (
      new URL(context.request.url).pathname === "/api/auth/callback/google"
    );
  } catch {
    return false;
  }
}

async function requireRegistrationGrant(
  options: ShapewebsCustomerAuthOptions,
  context: GenericEndpointContext | null,
  email: string,
): Promise<string> {
  const grant = readCustomerRegistrationGrant(
    context?.request,
    options.production,
  );

  if (!grant || !isCustomerBearerToken(grant)) {
    throw new APIError("FORBIDDEN", {
      message: "A valid customer invitation is required.",
    });
  }

  const registrationGrantHash = await hashCustomerBearerToken(grant);
  const allowed = await customerRegistrationGrantMatches(options.databaseUrl, {
    email,
    registrationGrantHash,
  });

  if (!allowed) {
    throw new APIError("FORBIDDEN", {
      message: "The customer invitation is invalid or expired.",
    });
  }

  return registrationGrantHash;
}

export function createShapewebsCustomerAuth(
  options: ShapewebsCustomerAuthOptions,
) {
  if (options.secret.length < 32) {
    throw new Error(
      "PORTAL_BETTER_AUTH_SECRET must contain at least 32 characters.",
    );
  }

  if (options.emailEncryptionSecret.length < 32) {
    throw new Error(
      "PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET must contain at least 32 characters.",
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      options.organizationId,
    )
  ) {
    throw new Error("SHAPEWEBS_ORGANIZATION_ID must be a UUID.");
  }

  assertCustomerOrigin(
    options.baseUrl,
    "PORTAL_BETTER_AUTH_URL",
    options.production,
  );
  options.trustedOrigins.forEach((origin) =>
    assertCustomerOrigin(
      origin,
      "Portal Better Auth trusted origin",
      options.production,
    ),
  );

  if (!options.trustedOrigins.includes(options.baseUrl)) {
    throw new Error(
      "Portal Better Auth trusted origins must include PORTAL_BETTER_AUTH_URL.",
    );
  }

  if (options.production && !options.google) {
    throw new Error("Customer Google OAuth must be configured in production.");
  }

  const database = createDatabase(options.databaseUrl);
  const cookiePolicy = getCustomerCookiePolicy(options.production);

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
    advanced: {
      cookiePrefix: cookiePolicy.prefix,
      defaultCookieAttributes: cookiePolicy.attributes,
      useSecureCookies: false,
    },
    appName: "Shapewebs Customer Portal",
    basePath: "/api/auth",
    baseURL: options.baseUrl,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: customerBetterAuthSchema,
    }),
    databaseHooks: {
      session: {
        create: {
          before: async (newSession, context) => {
            let active = await customerHasActiveMembership(
              options.databaseUrl,
              newSession.userId,
            );

            if (!active && isGoogleCallback(context)) {
              const grant = readCustomerRegistrationGrant(
                context?.request,
                options.production,
              );

              if (grant && isCustomerBearerToken(grant)) {
                const accepted = await acceptCustomerGoogleInvitation(
                  options.databaseUrl,
                  {
                    registrationGrantHash: await hashCustomerBearerToken(grant),
                    userId: newSession.userId,
                  },
                );
                active = accepted !== null;
              }
            }

            if (!active) {
              throw new APIError("FORBIDDEN", {
                message: "Customer access is not active.",
              });
            }

            return {
              data: {
                ...newSession,
                token: generateCustomerBearerToken(),
              },
            };
          },
          after: async (newSession) => {
            await provisionCustomerSessionSecurity(options.databaseUrl, {
              sessionId: newSession.id,
              userId: newSession.userId,
            });
          },
        },
      },
      user: {
        create: {
          before: async (newUser, context) => {
            const email = newUser.email.trim().toLowerCase();

            if (
              !isGoogleCallback(context) ||
              newUser.emailVerified !== true ||
              !emailAddressSchema.safeParse(email).success
            ) {
              throw new APIError("FORBIDDEN", {
                message: "Customer self-registration is disabled.",
              });
            }

            await requireRegistrationGrant(options, context, email);

            return { data: { ...newUser, email } };
          },
        },
      },
    },
    disabledPaths: [...disabledCustomerAuthPaths],
    emailAndPassword: {
      autoSignIn: false,
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 15,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: passwordResetLifetimeSeconds,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ token, user }) => {
        if (
          !(await customerHasActiveMembership(options.databaseUrl, user.id))
        ) {
          return;
        }

        const tokenHash = await hashCustomerOpaqueToken(token);
        await enqueueCustomerAuthEmail(options.databaseUrl, {
          encryptedToken: await encryptCustomerEmailToken(
            token,
            options.emailEncryptionSecret,
            passwordResetLifetimeSeconds,
          ),
          expiresAt: new Date(
            Date.now() + passwordResetLifetimeSeconds * 1_000,
          ),
          idempotencyKey: `customer.password_reset/${tokenHash}`,
          kind: "password_reset",
          organizationId: options.organizationId,
          recipient: user.email.trim().toLowerCase(),
          tokenHash,
          userId: user.id,
        });
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/link-social") {
          return;
        }

        const authorization =
          context.request?.headers.get("x-shapewebs-method-authorization") ??
          context.headers?.get("x-shapewebs-method-authorization");

        const activeSession = await getSessionFromCtx(context);

        if (
          !activeSession ||
          !verifyCustomerMethodAuthorization(
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
            message: "Recent customer reauthentication is required.",
          });
        }
      }),
    },
    onAPIError: {
      errorURL: "/login?error=authentication",
      onError: async () => {
        await Promise.resolve(options.onApiError?.());
      },
    },
    plugins: [
      haveIBeenPwned({
        paths: ["/change-password", "/reset-password"],
      }),
    ],
    rateLimit: {
      customRules: {
        "/request-password-reset": { max: 3, window: 60 },
        "/reset-password": { max: 5, window: 60 },
        "/sign-in/email": { max: 5, window: 60 },
        "/sign-in/social": { max: 10, window: 60 },
      },
      enabled: true,
      max: 60,
      storage: "database",
      window: 60,
    },
    secret: options.secret,
    session: {
      disableSessionRefresh: true,
      expiresIn: customerSessionLifetimeSeconds,
      freshAge: 5 * 60,
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
    telemetry: { enabled: false },
    trustedOrigins: options.trustedOrigins,
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
  });
}
