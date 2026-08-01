import { randomBytes } from "node:crypto";

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

export function isCustomerBearerToken(value: string): boolean {
  return customerBearerTokenPattern.test(value);
}
