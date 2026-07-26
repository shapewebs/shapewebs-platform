import "server-only";

import { clearPortalRegistrationCookies } from "./registration-context";

export function readSetCookies(headers: Headers): string[] {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };

  return (
    headersWithCookies.getSetCookie?.() ??
    (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : [])
  );
}

export function hardenPortalAuthResponse(
  request: Request,
  response: Response,
): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");

  const pathname = new URL(request.url).pathname;
  if (pathname === "/api/auth/sign-out" && response.ok) {
    headers.set("Clear-Site-Data", '"cache", "cookies", "storage"');
  }

  if (
    pathname === "/api/auth/callback/google" &&
    response.status >= 300 &&
    response.status < 400
  ) {
    for (const cookie of clearPortalRegistrationCookies()) {
      headers.append("Set-Cookie", cookie);
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
