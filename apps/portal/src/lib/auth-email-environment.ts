import "server-only";

export type PortalAuthEmailEnvironment = {
  databaseUrl: string;
  encryptionSecret: string;
  from: string;
  organizationId: string;
  portalBaseUrl: string;
  resendApiKey: string;
};

export function getPortalAuthEmailEnvironment(): PortalAuthEmailEnvironment | null {
  const databaseUrl = process.env.PORTAL_DATABASE_URL;
  const encryptionSecret = process.env.PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET;
  const from = process.env.PORTAL_AUTH_EMAIL_FROM;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID;
  const portalBaseUrl = process.env.PORTAL_BETTER_AUTH_URL;
  const resendApiKey = process.env.PORTAL_RESEND_API_KEY;

  if (
    !databaseUrl ||
    !encryptionSecret ||
    encryptionSecret.length < 32 ||
    !from ||
    !organizationId ||
    !portalBaseUrl ||
    !resendApiKey
  ) {
    return null;
  }

  try {
    const parsed = new URL(portalBaseUrl);
    if (
      parsed.origin !== portalBaseUrl ||
      parsed.username ||
      parsed.password ||
      (process.env.NODE_ENV === "production" && parsed.protocol !== "https:")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    databaseUrl,
    encryptionSecret,
    from,
    organizationId,
    portalBaseUrl,
    resendApiKey,
  };
}
