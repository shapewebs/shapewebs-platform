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
  // This remains code-owned: provider values cannot enable an unimplemented
  // route set. Runtime readiness still requires the complete isolated portal
  // namespace below.
  return true;
}

export function isPortalRuntimeReady(
  environment: PortalEnvironment = process.env,
): boolean {
  return isPortalIdentityImplemented() && hasPortalAuthEnvironment(environment);
}

export function getPortalDatabaseUrl(): string | null {
  return isPortalRuntimeReady()
    ? (process.env.PORTAL_DATABASE_URL ?? null)
    : null;
}

export function getPortalBaseUrl(): string | null {
  return isPortalRuntimeReady()
    ? (process.env.PORTAL_BETTER_AUTH_URL ?? null)
    : null;
}

export function splitPortalEnvironmentList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
