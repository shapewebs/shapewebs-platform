import { getSessionCookie as getBetterAuthSessionCookie } from "better-auth/cookies";

const adminCookiePrefix = "shapewebs";

export function getSessionCookie(request: Headers | Request): string | null {
  return getBetterAuthSessionCookie(request, {
    cookiePrefix: adminCookiePrefix,
  });
}
