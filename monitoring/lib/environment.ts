type StagingOriginEnvironment =
  "CHECKLY_STAGING_ADMIN_BASE_URL" | "CHECKLY_STAGING_WEB_BASE_URL";

export function getOptionalExactHttpsOrigin(
  environmentName: StagingOriginEnvironment,
  environment: NodeJS.ProcessEnv = process.env,
): URL | null {
  const configuredUrl =
    environmentName === "CHECKLY_STAGING_ADMIN_BASE_URL"
      ? environment.CHECKLY_STAGING_ADMIN_BASE_URL
      : environment.CHECKLY_STAGING_WEB_BASE_URL;

  if (!configuredUrl) {
    return null;
  }

  const baseUrl = new URL(configuredUrl);

  if (
    baseUrl.protocol !== "https:" ||
    baseUrl.origin !== configuredUrl ||
    baseUrl.username ||
    baseUrl.password
  ) {
    throw new Error(`${environmentName} must be one exact HTTPS origin.`);
  }

  return baseUrl;
}
