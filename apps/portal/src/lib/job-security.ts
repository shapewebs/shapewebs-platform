import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidPortalJobSecret(
  authorization: string | null,
  expectedSecret: string | undefined,
): boolean {
  if (
    !authorization?.startsWith("Bearer ") ||
    !expectedSecret ||
    expectedSecret.length < 32
  ) {
    return false;
  }

  const provided = createHash("sha256")
    .update(authorization.slice("Bearer ".length))
    .digest();
  const expected = createHash("sha256").update(expectedSecret).digest();
  return timingSafeEqual(provided, expected);
}
