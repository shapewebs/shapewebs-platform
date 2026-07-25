import { randomBytes } from "node:crypto";

import { getCookies } from "better-auth/cookies";
import { serializeSignedCookie } from "better-call";

const sessionTokenPattern = /^[A-Za-z0-9_-]{43}$/;

type AuthCookieOptions = Parameters<typeof getCookies>[0];

export function generateAdminSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function serializeAdminSessionCookie(input: {
  authOptions: AuthCookieOptions;
  expiresAt: Date;
  now?: Date;
  secret: string;
  token: string;
}): Promise<string> {
  const now = input.now ?? new Date();
  const remainingSeconds = Math.floor(
    (input.expiresAt.getTime() - now.getTime()) / 1_000,
  );

  if (
    !sessionTokenPattern.test(input.token) ||
    !Number.isFinite(input.expiresAt.getTime()) ||
    remainingSeconds <= 0
  ) {
    throw new Error("The rotated administrative session is invalid.");
  }

  const sessionCookie = getCookies(input.authOptions).sessionToken;

  return serializeSignedCookie(sessionCookie.name, input.token, input.secret, {
    ...sessionCookie.attributes,
    maxAge: remainingSeconds,
  });
}
