export function requireStagingTarget(targetName) {
  const rawTarget = process.env[targetName];
  const allowedHosts = (process.env.SHAPEWEBS_STAGING_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (!rawTarget) {
    throw new Error(`${targetName} is required for release verification.`);
  }

  if (allowedHosts.length === 0) {
    throw new Error(
      "SHAPEWEBS_STAGING_HOSTS must contain the exact approved staging hostnames.",
    );
  }

  const target = new URL(rawTarget);

  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  ) {
    throw new Error(
      `${targetName} must be HTTPS and must not contain credentials, a query, or a fragment.`,
    );
  }

  if (!allowedHosts.includes(target.hostname.toLowerCase())) {
    throw new Error(
      `${targetName} is not in the SHAPEWEBS_STAGING_HOSTS allowlist.`,
    );
  }

  return target;
}
