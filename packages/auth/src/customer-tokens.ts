import { randomBytes } from "node:crypto";

import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";

const customerEmailTokenSalt = "shapewebs/customer-auth-email/v1";
const customerBearerTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const customerOpaqueTokenPattern = /^[A-Za-z0-9_-]{20,512}$/;

export function generateCustomerBearerToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function hashCustomerBearerToken(token: string): Promise<string> {
  if (!customerBearerTokenPattern.test(token)) {
    throw new Error("The customer bearer token is invalid.");
  }

  return hashCustomerOpaqueToken(token);
}

export async function hashCustomerOpaqueToken(token: string): Promise<string> {
  if (!customerOpaqueTokenPattern.test(token)) {
    throw new Error("The customer email token is invalid.");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return Buffer.from(digest).toString("hex");
}

export async function encryptCustomerEmailToken(
  token: string,
  encryptionSecret: string,
  expiresInSeconds: number,
): Promise<string> {
  if (encryptionSecret.length < 32) {
    throw new Error(
      "PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET must contain at least 32 characters.",
    );
  }

  if (!customerOpaqueTokenPattern.test(token) || expiresInSeconds < 1) {
    throw new Error("The customer email token input is invalid.");
  }

  return symmetricEncodeJWT(
    { token },
    encryptionSecret,
    customerEmailTokenSalt,
    expiresInSeconds,
  );
}

export async function decryptCustomerEmailToken(
  encryptedToken: string,
  encryptionSecret: string,
): Promise<string | null> {
  if (encryptionSecret.length < 32 || encryptedToken.length > 8192) {
    return null;
  }

  const payload = await symmetricDecodeJWT<{ token?: unknown }>(
    encryptedToken,
    encryptionSecret,
    customerEmailTokenSalt,
  );

  return typeof payload?.token === "string" &&
    customerOpaqueTokenPattern.test(payload.token)
    ? payload.token
    : null;
}

export function isCustomerBearerToken(value: string): boolean {
  return customerBearerTokenPattern.test(value);
}
