import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";

const adminEmailTokenSalt = "shapewebs/admin-auth-email/v1";
const adminEmailTokenPattern = /^[A-Za-z0-9_.-]{20,4096}$/;

export async function hashAdminEmailToken(token: string): Promise<string> {
  if (!adminEmailTokenPattern.test(token)) {
    throw new Error("The administrative email token is invalid.");
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Buffer.from(digest).toString("hex");
}

export async function encryptAdminEmailToken(
  token: string,
  encryptionSecret: string,
  expiresInSeconds: number,
): Promise<string> {
  if (encryptionSecret.length < 32) {
    throw new Error(
      "ADMIN_AUTH_EMAIL_ENCRYPTION_SECRET must contain at least 32 characters.",
    );
  }

  if (!adminEmailTokenPattern.test(token) || expiresInSeconds < 1) {
    throw new Error("The administrative email token input is invalid.");
  }

  return symmetricEncodeJWT(
    { token },
    encryptionSecret,
    adminEmailTokenSalt,
    expiresInSeconds,
  );
}

export async function decryptAdminEmailToken(
  encryptedToken: string,
  encryptionSecret: string,
): Promise<string | null> {
  if (encryptionSecret.length < 32 || encryptedToken.length > 8192) {
    return null;
  }

  try {
    const payload = await symmetricDecodeJWT<{ token?: unknown }>(
      encryptedToken,
      encryptionSecret,
      adminEmailTokenSalt,
    );

    return typeof payload?.token === "string" &&
      adminEmailTokenPattern.test(payload.token)
      ? payload.token
      : null;
  } catch {
    return null;
  }
}
