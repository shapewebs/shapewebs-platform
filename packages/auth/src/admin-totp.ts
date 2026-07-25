import { createHmac, timingSafeEqual } from "node:crypto";

import {
  consumeAdminTotpCounter,
  isAdminTotpLocked,
  recordAdminTotpFailure,
} from "@shapewebs/database/admin-auth";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { eq } from "drizzle-orm";
import { symmetricDecrypt } from "better-auth/crypto";

const totpDigits = 6;
const totpPeriodMs = 30_000;
const totpWindow = 0;

export type AdminTotpVerificationResult =
  | {
      enrollmentPending: boolean;
      status: "accepted";
    }
  | {
      status: "invalid" | "locked" | "replayed" | "unavailable";
    };

function createTotpCode(secret: string, counter: number): string {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", secret).update(counterBytes).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;

  return (binary % 10 ** totpDigits).toString().padStart(totpDigits, "0");
}

export function findMatchingTotpCounter(
  code: string,
  secret: string,
  now = new Date(),
): number | null {
  if (!/^\d{6}$/.test(code) || secret.length === 0) {
    return null;
  }

  const currentCounter = Math.floor(now.getTime() / totpPeriodMs);
  const suppliedCode = Buffer.from(code, "ascii");
  let matchedCounter: number | null = null;

  for (
    let counter = Math.max(0, currentCounter - totpWindow);
    counter <= currentCounter + totpWindow;
    counter += 1
  ) {
    const expectedCode = Buffer.from(createTotpCode(secret, counter), "ascii");

    if (timingSafeEqual(suppliedCode, expectedCode)) {
      matchedCounter = Math.max(matchedCounter ?? counter, counter);
    }
  }

  return matchedCounter;
}

export async function verifyAdminTotpCode(input: {
  code: string;
  databaseUrl: string;
  secret: string;
  sessionId: string;
  userId: string;
  verifiedAt?: Date;
}): Promise<AdminTotpVerificationResult> {
  const verifiedAt = input.verifiedAt ?? new Date();

  if (await isAdminTotpLocked(input.databaseUrl, input.userId, verifiedAt)) {
    return { status: "locked" };
  }

  const database = createDatabase(input.databaseUrl);
  const [factor] = await database
    .select({
      encryptedSecret: authSchema.twoFactor.secret,
      verified: authSchema.twoFactor.verified,
    })
    .from(authSchema.twoFactor)
    .where(eq(authSchema.twoFactor.userId, input.userId))
    .limit(1);

  if (!factor) {
    return { status: "unavailable" };
  }

  const totpSecret = await symmetricDecrypt({
    data: factor.encryptedSecret,
    key: input.secret,
  });
  const matchedCounter = findMatchingTotpCounter(
    input.code,
    totpSecret,
    verifiedAt,
  );

  if (matchedCounter === null) {
    await recordAdminTotpFailure(input.databaseUrl, input.userId, verifiedAt);
    return { status: "invalid" };
  }

  const consumed = await consumeAdminTotpCounter(
    input.databaseUrl,
    {
      counter: matchedCounter,
      sessionId: input.sessionId,
      userId: input.userId,
    },
    verifiedAt,
  );

  if (!consumed) {
    return { status: "replayed" };
  }

  return {
    enrollmentPending: factor.verified !== true,
    status: "accepted",
  };
}
