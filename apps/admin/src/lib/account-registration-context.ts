import "server-only";

import { cookies } from "next/headers";
import {
  clearCustomerRegistrationContext,
  clearCustomerRegistrationGrant,
  decryptCustomerRegistrationContext,
  encryptCustomerRegistrationContext,
  getCustomerRegistrationContextCookieName,
  serializeCustomerRegistrationContext,
  serializeCustomerRegistrationGrant,
  type CustomerRegistrationContext,
} from "@shapewebs/auth/server";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function readRequestCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";

  for (const pair of cookieHeader.split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 1 || pair.slice(0, separator).trim() !== name) {
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

async function decryptContext(
  encryptedContext: string | null,
): Promise<CustomerRegistrationContext | null> {
  const encryptionSecret = process.env.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET;
  if (!encryptedContext || !encryptionSecret) {
    return null;
  }

  return decryptCustomerRegistrationContext(encryptedContext, encryptionSecret);
}

export async function getAccountRegistrationContext(): Promise<CustomerRegistrationContext | null> {
  const store = await cookies();
  const value = store.get(
    getCustomerRegistrationContextCookieName(isProduction()),
  )?.value;

  return decryptContext(value ?? null);
}

export async function getAccountRegistrationContextFromRequest(
  request: Request,
): Promise<CustomerRegistrationContext | null> {
  return decryptContext(
    readRequestCookie(
      request,
      getCustomerRegistrationContextCookieName(isProduction()),
    ),
  );
}

export async function createAccountRegistrationCookies(input: {
  email: string;
  name: string;
  registrationGrant: string;
}): Promise<string[]> {
  const encryptionSecret = process.env.ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET;
  if (!encryptionSecret) {
    throw new Error("Customer registration encryption is unavailable.");
  }

  const production = isProduction();
  const context = await encryptCustomerRegistrationContext(
    { email: input.email, name: input.name },
    encryptionSecret,
  );

  return [
    serializeCustomerRegistrationGrant(input.registrationGrant, production),
    serializeCustomerRegistrationContext(context, production),
  ];
}

export function clearAccountRegistrationCookies(): string[] {
  const production = isProduction();
  return [
    clearCustomerRegistrationGrant(production),
    clearCustomerRegistrationContext(production),
  ];
}
