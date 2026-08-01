const fallbackAdminPath = "/dashboard";
const allowedAdminPrefixes = [
  "/account",
  "/audit",
  "/content",
  "/customer",
  "/dashboard",
  "/media",
  "/settings",
  "/studio",
  "/submissions",
] as const;
const adminOrigin = "https://admin.shapewebs.invalid";

export function getSafeAdminRedirectTarget(redirectTo?: string | null): string {
  if (!redirectTo || redirectTo.includes("\\")) {
    return fallbackAdminPath;
  }

  let target: URL;

  try {
    target = new URL(redirectTo, adminOrigin);
  } catch {
    return fallbackAdminPath;
  }

  if (target.origin !== adminOrigin) {
    return fallbackAdminPath;
  }

  const isAllowedPath = allowedAdminPrefixes.some(
    (prefix) =>
      target.pathname === prefix || target.pathname.startsWith(`${prefix}/`),
  );

  return isAllowedPath
    ? `${target.pathname}${target.search}${target.hash}`
    : fallbackAdminPath;
}

export function getAdminStepUpUrl(
  redirectTo: string,
  reason: "password-link" | "step-up" = "step-up",
): string {
  const parameters = new URLSearchParams({
    reason,
    redirectTo: getSafeAdminRedirectTarget(redirectTo),
  });

  return `/login/mfa?${parameters.toString()}`;
}
