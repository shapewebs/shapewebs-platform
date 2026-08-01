export function splitEnvironmentList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasAdminAuthConfig(): boolean {
  return Boolean(
    process.env.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET &&
    process.env.ADMIN_OWNER_EMAILS &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.DATABASE_URL &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.SHAPEWEBS_ORGANIZATION_ID,
  );
}

export function hasUnifiedAccountPortalConfig(): boolean {
  return Boolean(
    hasAdminAuthConfig() &&
    process.env.ACCOUNT_TURNSTILE_EXPECTED_HOSTNAME &&
    process.env.ACCOUNT_TURNSTILE_SECRET_KEY &&
    process.env.CUSTOMER_DATABASE_URL &&
    process.env.NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY,
  );
}

export function isLocalAdminSetupMode(): boolean {
  return process.env.NODE_ENV === "development" && !hasAdminAuthConfig();
}

export function getAdminDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || null;
}

export function getCustomerDatabaseUrl(): string | null {
  return process.env.CUSTOMER_DATABASE_URL || null;
}

export function getAdminBaseUrl(): string | null {
  return process.env.BETTER_AUTH_URL || null;
}

export function getAdminOrganizationId(): string | null {
  return process.env.SHAPEWEBS_ORGANIZATION_ID || null;
}

export function isTrustedAdminOrigin(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  const baseUrl = process.env.BETTER_AUTH_URL;
  const trustedOrigins = new Set([
    ...(baseUrl ? [baseUrl] : []),
    ...splitEnvironmentList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  ]);

  return trustedOrigins.has(origin);
}
