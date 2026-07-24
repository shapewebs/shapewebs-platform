import { createHash, timingSafeEqual } from "node:crypto";

export function hasValidBearerSecret(
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

  const providedSecret = authorization.slice("Bearer ".length);
  const providedDigest = createHash("sha256").update(providedSecret).digest();
  const expectedDigest = createHash("sha256").update(expectedSecret).digest();

  return timingSafeEqual(providedDigest, expectedDigest);
}
