import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildPortalContentSecurityPolicy } from "@shapewebs/config";

import { isPortalIdentityImplemented } from "@/lib/auth-environment";

function withPrivateHeaders(response: NextResponse, csp: string) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildPortalContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-nonce", nonce);

  if (!isPortalIdentityImplemented()) {
    return withPrivateHeaders(
      new NextResponse("Customer portal identity is not available.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }),
      csp,
    );
  }

  return withPrivateHeaders(
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
