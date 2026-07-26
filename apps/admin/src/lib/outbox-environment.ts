export type OutboxEnvironment = {
  adminBaseUrl: string;
  authEmailEncryptionSecret: string;
  databaseUrl: string;
  from: string;
  organizationId: string;
  resendApiKey: string;
  to: string;
};

export function getOutboxEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): OutboxEnvironment | null {
  const adminBaseUrl = environment.BETTER_AUTH_URL;
  const authEmailEncryptionSecret =
    environment.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET;
  const databaseUrl = environment.DATABASE_URL;
  const from = environment.LEAD_NOTIFICATION_FROM_EMAIL;
  const organizationId = environment.SHAPEWEBS_ORGANIZATION_ID;
  const resendApiKey = environment.RESEND_API_KEY;
  const to = environment.LEAD_NOTIFICATION_TO_EMAIL;

  if (
    !adminBaseUrl ||
    !authEmailEncryptionSecret ||
    authEmailEncryptionSecret.length < 32 ||
    !databaseUrl ||
    !from ||
    !organizationId ||
    !resendApiKey ||
    !to
  ) {
    return null;
  }

  try {
    const parsedAdminBaseUrl = new URL(adminBaseUrl);
    if (
      parsedAdminBaseUrl.origin !== adminBaseUrl ||
      parsedAdminBaseUrl.username ||
      parsedAdminBaseUrl.password ||
      !["http:", "https:"].includes(parsedAdminBaseUrl.protocol) ||
      (environment.NODE_ENV === "production" &&
        parsedAdminBaseUrl.protocol !== "https:")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return {
    adminBaseUrl,
    authEmailEncryptionSecret,
    databaseUrl,
    from,
    organizationId,
    resendApiKey,
    to,
  };
}
