const productionRegistrationCookieName =
  "__Host-shapewebs-customer-registration";
const developmentRegistrationCookieName = "shapewebs-customer-registration";

function getCustomerCookiePrefix(production: boolean): string {
  return production ? "__Host-shapewebs-customer" : "shapewebs-customer";
}

export function getCustomerCookiePolicy(production: boolean) {
  return {
    attributes: {
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: production,
    },
    prefix: getCustomerCookiePrefix(production),
  };
}

export function getCustomerRegistrationCookieName(production: boolean): string {
  return production
    ? productionRegistrationCookieName
    : developmentRegistrationCookieName;
}

export function readCustomerRegistrationGrant(
  request: Request | undefined,
  production: boolean,
): string | null {
  const cookieName = getCustomerRegistrationCookieName(production);
  const cookieHeader = request?.headers.get("cookie") ?? "";

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");

    if (separator < 1 || pair.slice(0, separator).trim() !== cookieName) {
      continue;
    }

    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export function serializeCustomerRegistrationGrant(
  grant: string,
  production: boolean,
): string {
  const secure = production ? "; Secure" : "";

  return `${getCustomerRegistrationCookieName(production)}=${encodeURIComponent(grant)}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`;
}

export function clearCustomerRegistrationGrant(production: boolean): string {
  const secure = production ? "; Secure" : "";

  return `${getCustomerRegistrationCookieName(production)}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}
