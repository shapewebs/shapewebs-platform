export function splitEnvironmentList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function hasAdminAuthConfig(): boolean {
  return Boolean(
    process.env.ADMIN_OWNER_EMAILS &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.DATABASE_URL &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.SHAPEWEBS_ORGANIZATION_ID,
  );
}

export function isLocalAdminSetupMode(): boolean {
  return process.env.NODE_ENV === "development" && !hasAdminAuthConfig();
}

export function getAdminDatabaseUrl(): string | null {
  return process.env.DATABASE_URL ?? null;
}

export function getAdminOrganizationId(): string | null {
  return process.env.SHAPEWEBS_ORGANIZATION_ID ?? null;
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
