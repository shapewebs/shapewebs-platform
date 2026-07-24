export type SyntheticRetentionEnvironment = {
  databaseUrl: string;
  organizationId: string;
  secret: string;
};

export function getSyntheticRetentionEnvironment(
  requestUrl: string,
  environment: NodeJS.ProcessEnv = process.env,
): SyntheticRetentionEnvironment | null {
  const adminBaseUrl = environment.BETTER_AUTH_URL;
  const databaseUrl = environment.DATABASE_URL;
  const organizationId = environment.SHAPEWEBS_ORGANIZATION_ID;
  const secret = environment.SYNTHETIC_RETENTION_SECRET;

  if (
    !adminBaseUrl ||
    !databaseUrl ||
    !organizationId ||
    !secret ||
    secret.length < 32 ||
    environment.VERCEL_ENV !== "preview"
  ) {
    return null;
  }

  try {
    const request = new URL(requestUrl);
    const admin = new URL(adminBaseUrl);

    if (
      request.origin !== admin.origin ||
      admin.origin !== adminBaseUrl ||
      admin.protocol !== "https:" ||
      admin.username ||
      admin.password
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    databaseUrl,
    organizationId,
    secret,
  };
}
