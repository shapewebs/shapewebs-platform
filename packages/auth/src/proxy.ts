import { getSessionCookie as getBetterAuthSessionCookie } from "better-auth/cookies";

import { getAdminCookiePrefix } from "./cookie-policy";

export function getSessionCookie(
  request: Headers | Request,
  options: {
    production?: boolean;
  } = {},
): string | null {
  return getBetterAuthSessionCookie(request, {
    cookiePrefix: getAdminCookiePrefix(
      options.production ?? process.env.NODE_ENV === "production",
    ),
  });
}
