type StagingOriginEnvironment =
  "CHECKLY_STAGING_ADMIN_BASE_URL" | "CHECKLY_STAGING_WEB_BASE_URL";

type ChecklyActivationProfile =
  "alert-test" | "disabled" | "enabled" | "staging";

const ALERT_TEST_CHECK_ID = "staging-admin-readiness";
const defaultStagingAdminOrigin = "https://admin-staging.shapewebs.com";
const defaultStagingWebOrigin = "https://staging.shapewebs.com";

export function isChecklyCheckActivated(
  checkId: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const profile = (environment.CHECKLY_ACTIVATION_PROFILE ??
    "disabled") as ChecklyActivationProfile;

  if (!["alert-test", "disabled", "enabled", "staging"].includes(profile)) {
    throw new Error(
      "CHECKLY_ACTIVATION_PROFILE must be disabled, alert-test, staging, or enabled.",
    );
  }

  return (
    profile === "enabled" ||
    (profile === "staging" && checkId.startsWith("staging-")) ||
    (profile === "alert-test" && checkId === ALERT_TEST_CHECK_ID)
  );
}

export function getExactStagingHttpsOrigin(
  environmentName: StagingOriginEnvironment,
  environment: NodeJS.ProcessEnv = process.env,
): URL {
  const configuredUrl =
    environmentName === "CHECKLY_STAGING_ADMIN_BASE_URL"
      ? (environment.CHECKLY_STAGING_ADMIN_BASE_URL ??
        defaultStagingAdminOrigin)
      : (environment.CHECKLY_STAGING_WEB_BASE_URL ?? defaultStagingWebOrigin);

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
