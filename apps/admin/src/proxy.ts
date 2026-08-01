import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "@shapewebs/auth/proxy";
import { buildAdminContentSecurityPolicy } from "@shapewebs/config";

import {
  hasAdminAuthConfig,
  isLocalAdminSetupMode,
} from "@/lib/auth-environment";

const protectedPrefixes = [
  "/account",
  "/audit",
  "/content",
  "/customer",
  "/dashboard",
  "/media",
  "/settings",
  "/submissions",
  "/studio",
];

const turnstilePrefixes = [
  "/forgot-password",
  "/invite",
  "/register",
  "/reset-password",
  "/verify",
];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function withSecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const authConfigured = hasAdminAuthConfig();
  const publicSiteOrigin =
    authConfigured && process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : undefined;
  const csp = buildAdminContentSecurityPolicy(nonce, {
    allowPublicContentImages: true,
    allowTurnstile: turnstilePrefixes.some(
      (prefix) =>
        request.nextUrl.pathname === prefix ||
        request.nextUrl.pathname.startsWith(`${prefix}/`),
    ),
    formActionOrigins: publicSiteOrigin ? [publicSiteOrigin] : [],
  });
  const requestHeaders = new Headers(request.headers);
  const protectedPath = isProtectedPath(request.nextUrl.pathname);
  const setupMode = isLocalAdminSetupMode();

  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  if (!authConfigured && protectedPath && !setupMode) {
    return withSecurityHeaders(
      new NextResponse("Admin authentication is unavailable.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }),
      csp,
    );
  }

  if (
    protectedPath &&
    !setupMode &&
    !getSessionCookie(request, {
      production: process.env.NODE_ENV === "production",
    })
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }

  return withSecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    csp,
  );
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
