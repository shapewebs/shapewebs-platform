import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const lifetimeMs = 60 * 1_000;

type AdminMethodAuthorization = {
  action: "link_google";
  issuedAt: number;
  nonce: string;
  sessionId: string;
  userId: string;
};

function sign(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value).digest();
}

export function createAdminMethodAuthorization(
  input: { action: "link_google"; sessionId: string; userId: string },
  secret: string,
  now = Date.now(),
): string {
  if (
    secret.length < 32 ||
    input.sessionId.length < 8 ||
    input.sessionId.length > 128 ||
    input.userId.length < 8 ||
    input.userId.length > 128
  ) {
    throw new Error("Administrative method authorization input is invalid.");
  }

  const payload: AdminMethodAuthorization = {
    ...input,
    issuedAt: now,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded, secret).toString("base64url")}`;
}

export function verifyAdminMethodAuthorization(
  token: string | null | undefined,
  secret: string,
  now = Date.now(),
  binding?: { sessionId: string; userId: string },
): boolean {
  if (!token || token.length > 2_048 || secret.length < 32) {
    return false;
  }

  const [encoded, signature, ...rest] = token.split(".");
  if (!encoded || !signature || rest.length > 0) {
    return false;
  }

  const supplied = Buffer.from(signature, "base64url");
  const expected = sign(encoded, secret);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<AdminMethodAuthorization>;

    return (
      payload.action === "link_google" &&
      typeof payload.issuedAt === "number" &&
      Number.isSafeInteger(payload.issuedAt) &&
      payload.issuedAt <= now + 5_000 &&
      payload.issuedAt >= now - lifetimeMs &&
      typeof payload.nonce === "string" &&
      /^[A-Za-z0-9_-]{22}$/.test(payload.nonce) &&
      typeof payload.sessionId === "string" &&
      payload.sessionId.length >= 8 &&
      payload.sessionId.length <= 128 &&
      typeof payload.userId === "string" &&
      payload.userId.length >= 8 &&
      payload.userId.length <= 128 &&
      (!binding ||
        (payload.sessionId === binding.sessionId &&
          payload.userId === binding.userId))
    );
  } catch {
    return false;
  }
}
