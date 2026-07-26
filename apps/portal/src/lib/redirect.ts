const portalOrigin = "https://portal.shapewebs.invalid";
const fallbackPortalPath = "/dashboard";
const allowedPortalPrefixes = ["/dashboard", "/projects", "/settings"] as const;

export function getSafePortalRedirectTarget(
  redirectTo?: string | null,
): string {
  if (!redirectTo || redirectTo.includes("\\")) {
    return fallbackPortalPath;
  }

  let target: URL;

  try {
    target = new URL(redirectTo, portalOrigin);
  } catch {
    return fallbackPortalPath;
  }

  if (target.origin !== portalOrigin) {
    return fallbackPortalPath;
  }

  const allowed = allowedPortalPrefixes.some(
    (prefix) =>
      target.pathname === prefix || target.pathname.startsWith(`${prefix}/`),
  );

  return allowed
    ? `${target.pathname}${target.search}${target.hash}`
    : fallbackPortalPath;
}
