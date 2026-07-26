import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authorizeCustomerSession,
  type CustomerAuthorizationContext,
} from "@shapewebs/database/server";

import { getPortalDatabaseUrl } from "./auth-environment";
import { getPortalAuth } from "./better-auth";
import { getSafePortalRedirectTarget } from "./redirect";

type BetterAuthCustomerSession = NonNullable<
  Awaited<
    ReturnType<
      NonNullable<ReturnType<typeof getPortalAuth>>["api"]["getSession"]
    >
  >
>;

export type CustomerRuntimeState = {
  authenticationAvailable: boolean;
  authorization: CustomerAuthorizationContext | null;
  primarySession: BetterAuthCustomerSession | null;
};

const getCustomerRuntimeState = cache(
  async (): Promise<CustomerRuntimeState> => {
    const auth = getPortalAuth();
    const databaseUrl = getPortalDatabaseUrl();

    if (!auth || !databaseUrl) {
      return {
        authenticationAvailable: false,
        authorization: null,
        primarySession: null,
      };
    }

    const primarySession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!primarySession || primarySession.user.emailVerified !== true) {
      return {
        authenticationAvailable: true,
        authorization: null,
        primarySession: null,
      };
    }

    const authorization = await authorizeCustomerSession(databaseUrl, {
      sessionId: primarySession.session.id,
      userId: primarySession.user.id,
    });

    return {
      authenticationAvailable: true,
      authorization,
      primarySession,
    };
  },
);

export async function requireCustomerPageSession(redirectTo: string): Promise<
  CustomerRuntimeState & {
    authorization: CustomerAuthorizationContext;
    primarySession: BetterAuthCustomerSession;
  }
> {
  const runtime = await getCustomerRuntimeState();

  if (!runtime.authenticationAvailable) {
    redirect("/login?error=unavailable");
  }

  if (!runtime.authorization || !runtime.primarySession) {
    const safeRedirect = getSafePortalRedirectTarget(redirectTo);
    redirect(`/login?redirectTo=${encodeURIComponent(safeRedirect)}`);
  }

  return {
    ...runtime,
    authorization: runtime.authorization,
    primarySession: runtime.primarySession,
  };
}

export async function requireCustomerApiSession(): Promise<
  | {
      runtime: CustomerRuntimeState & {
        authorization: CustomerAuthorizationContext;
        primarySession: BetterAuthCustomerSession;
      };
      status: "authorized";
    }
  | {
      error: "authentication_required" | "authentication_unavailable";
      status: "denied";
      statusCode: 401 | 503;
    }
> {
  const runtime = await getCustomerRuntimeState();

  if (!runtime.authenticationAvailable) {
    return {
      error: "authentication_unavailable",
      status: "denied",
      statusCode: 503,
    };
  }

  if (!runtime.authorization || !runtime.primarySession) {
    return {
      error: "authentication_required",
      status: "denied",
      statusCode: 401,
    };
  }

  return {
    runtime: {
      ...runtime,
      authorization: runtime.authorization,
      primarySession: runtime.primarySession,
    },
    status: "authorized",
  };
}
