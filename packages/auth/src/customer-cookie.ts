const productionRegistrationCookieName =
  "__Host-shapewebs-customer-registration";
const developmentRegistrationCookieName = "shapewebs-customer-registration";
const productionRegistrationContextCookieName =
  "__Host-shapewebs-customer-registration-context";
const developmentRegistrationContextCookieName =
  "shapewebs-customer-registration-context";

export function getCustomerRegistrationCookieName(production: boolean): string {
  return production
    ? productionRegistrationCookieName
    : developmentRegistrationCookieName;
}

export function getCustomerRegistrationContextCookieName(
  production: boolean,
): string {
  return production
    ? productionRegistrationContextCookieName
    : developmentRegistrationContextCookieName;
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

export function serializeCustomerRegistrationContext(
  encryptedContext: string,
  production: boolean,
): string {
  const secure = production ? "; Secure" : "";

  return `${getCustomerRegistrationContextCookieName(production)}=${encodeURIComponent(encryptedContext)}; Path=/; Max-Age=1800; HttpOnly; SameSite=Lax${secure}`;
}

export function clearCustomerRegistrationContext(production: boolean): string {
  const secure = production ? "; Secure" : "";

  return `${getCustomerRegistrationContextCookieName(production)}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}
