import { hashPassword } from "better-auth/crypto";

const minimumCustomerPasswordLength = 15;
const maximumCustomerPasswordLength = 128;
const maximumPwnedPasswordResponseBytes = 1_000_000;

export type CustomerPasswordFailureCode =
  "compromised" | "invalid" | "provider_unavailable";

export class CustomerPasswordError extends Error {
  readonly code: CustomerPasswordFailureCode;

  constructor(code: CustomerPasswordFailureCode, message: string) {
    super(message);
    this.name = "CustomerPasswordError";
    this.code = code;
  }
}

export function assertCustomerPasswordPolicy(password: string): void {
  if (
    password.length < minimumCustomerPasswordLength ||
    password.length > maximumCustomerPasswordLength ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(password)
  ) {
    throw new CustomerPasswordError(
      "invalid",
      `Use between ${minimumCustomerPasswordLength} and ${maximumCustomerPasswordLength} characters.`,
    );
  }
}

export async function hashCustomerPassword(password: string): Promise<string> {
  assertCustomerPasswordPolicy(password);
  return hashPassword(password);
}

async function sha1Hex(value: string): Promise<string> {
  // SHA-1 is required only for the HIBP k-anonymity prefix protocol. Password
  // storage remains Better Auth's scrypt implementation.
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(value),
  );

  return Buffer.from(digest).toString("hex").toUpperCase();
}

export async function assertCustomerPasswordNotCompromised(
  password: string,
  options: {
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<void> {
  assertCustomerPasswordPolicy(password);

  const fingerprint = await sha1Hex(password);
  const prefix = fingerprint.slice(0, 5);
  const suffix = fingerprint.slice(5);
  const abortController = new AbortController();
  const timeout = setTimeout(
    () => abortController.abort(),
    options.timeoutMs ?? 3_000,
  );

  try {
    const response = await (options.fetchImplementation ?? fetch)(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true",
          "User-Agent": "Shapewebs Customer Password Assurance",
        },
        signal: abortController.signal,
      },
    );

    if (!response.ok) {
      throw new CustomerPasswordError(
        "provider_unavailable",
        "Password safety validation is temporarily unavailable.",
      );
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);

    if (
      Number.isFinite(contentLength) &&
      contentLength > maximumPwnedPasswordResponseBytes
    ) {
      throw new CustomerPasswordError(
        "provider_unavailable",
        "Password safety validation returned an invalid response.",
      );
    }

    const body = await response.text();

    if (body.length > maximumPwnedPasswordResponseBytes) {
      throw new CustomerPasswordError(
        "provider_unavailable",
        "Password safety validation returned an invalid response.",
      );
    }

    const compromised = body.split("\n").some((line) => {
      const candidate = line.split(":", 1)[0]?.trim().toUpperCase();
      return candidate === suffix;
    });

    if (compromised) {
      throw new CustomerPasswordError(
        "compromised",
        "This password appears in a known breach. Choose a different password.",
      );
    }
  } catch (error) {
    if (error instanceof CustomerPasswordError) {
      throw error;
    }

    throw new CustomerPasswordError(
      "provider_unavailable",
      "Password safety validation is temporarily unavailable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const customerPasswordPolicy = Object.freeze({
  maximumLength: maximumCustomerPasswordLength,
  minimumLength: minimumCustomerPasswordLength,
});
