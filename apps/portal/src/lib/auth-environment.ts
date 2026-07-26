import { parsePortalEnv } from "@shapewebs/validation";

type PortalEnvironment = Record<string, string | undefined>;

function isExactHttpsOrigin(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.origin === value &&
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function hasPortalAuthEnvironment(
  environment: PortalEnvironment = process.env,
): boolean {
  try {
    const parsed = parsePortalEnv(environment);

    if (
      !parsed.NEXT_PUBLIC_PORTAL_URL ||
      !parsed.NEXT_PUBLIC_PORTAL_TURNSTILE_SITE_KEY ||
      !parsed.PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET ||
      !parsed.PORTAL_BETTER_AUTH_SECRET ||
      !parsed.PORTAL_BETTER_AUTH_TRUSTED_ORIGINS ||
      !parsed.PORTAL_BETTER_AUTH_URL ||
      !parsed.PORTAL_DATABASE_URL ||
      !parsed.PORTAL_GOOGLE_CLIENT_ID ||
      !parsed.PORTAL_GOOGLE_CLIENT_SECRET ||
      !parsed.PORTAL_TURNSTILE_EXPECTED_HOSTNAME ||
      !parsed.PORTAL_TURNSTILE_SECRET_KEY ||
      !parsed.SHAPEWEBS_ORGANIZATION_ID
    ) {
      return false;
    }

    if (
      !isExactHttpsOrigin(parsed.NEXT_PUBLIC_PORTAL_URL ?? "") ||
      !isExactHttpsOrigin(parsed.PORTAL_BETTER_AUTH_URL ?? "") ||
      parsed.NEXT_PUBLIC_PORTAL_URL !== parsed.PORTAL_BETTER_AUTH_URL
    ) {
      return false;
    }

    const trustedOrigins = (parsed.PORTAL_BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

    return (
      trustedOrigins.length > 0 && trustedOrigins.every(isExactHttpsOrigin)
    );
  } catch {
    return false;
  }
}

export function isPortalIdentityImplemented(): boolean {
  // This code-owned gate cannot be opened with provider configuration alone.
  // It is replaced only after customer auth, authorization and RLS are proven.
  return false;
}

export function isPortalRuntimeReady(
  environment: PortalEnvironment = process.env,
): boolean {
  return isPortalIdentityImplemented() && hasPortalAuthEnvironment(environment);
}
