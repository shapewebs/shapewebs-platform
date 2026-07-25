import { createHmac, timingSafeEqual } from "node:crypto";

import {
  consumeAdminTotpCounter,
  isAdminTotpLocked,
  recordAdminTotpFailure,
} from "@shapewebs/database/admin-auth";
import * as authSchema from "@shapewebs/database/auth-schema";
import { createDatabase } from "@shapewebs/database/factory";
import { eq } from "drizzle-orm";
import { symmetricDecrypt, type SecretConfig } from "better-auth/crypto";

const totpDigits = 6;
const totpPeriodMs = 30_000;
const totpWindow = 0;

export type AdminTotpVerificationResult =
  | {
      enrollmentPending: boolean;
      status: "accepted";
      verifiedAt: Date;
    }
  | {
      reasonCode:
        | "counter_state_unavailable"
        | "factor_decryption_unavailable"
        | "factor_unavailable"
        | "failure_state_unavailable"
        | "invalid_code"
        | "lock_state_unavailable"
        | "locked"
        | "replayed";
      status: "invalid" | "locked" | "replayed" | "unavailable";
    };

export async function decryptAdminTotpSecret(
  encryptedSecret: string,
  key: string | SecretConfig,
): Promise<string> {
  return symmetricDecrypt({
    data: encryptedSecret,
    key,
  });
}

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
  secret: string | SecretConfig;
  sessionId: string;
  userId: string;
  verifiedAt?: Date;
}): Promise<AdminTotpVerificationResult> {
  const verifiedAt = input.verifiedAt ?? new Date();

  try {
    if (await isAdminTotpLocked(input.databaseUrl, input.userId, verifiedAt)) {
      return { reasonCode: "locked", status: "locked" };
    }
  } catch {
    return {
      reasonCode: "lock_state_unavailable",
      status: "unavailable",
    };
  }

  let factor:
    | {
        encryptedSecret: string;
        verified: boolean | null;
      }
    | undefined;

  try {
    const database = createDatabase(input.databaseUrl);
    [factor] = await database
      .select({
        encryptedSecret: authSchema.twoFactor.secret,
        verified: authSchema.twoFactor.verified,
      })
      .from(authSchema.twoFactor)
      .where(eq(authSchema.twoFactor.userId, input.userId))
      .limit(1);
  } catch {
    return {
      reasonCode: "factor_unavailable",
      status: "unavailable",
    };
  }

  if (!factor) {
    return {
      reasonCode: "factor_unavailable",
      status: "unavailable",
    };
  }

  let totpSecret: string;

  try {
    totpSecret = await decryptAdminTotpSecret(
      factor.encryptedSecret,
      input.secret,
    );
  } catch {
    return {
      reasonCode: "factor_decryption_unavailable",
      status: "unavailable",
    };
  }

  const matchedCounter = findMatchingTotpCounter(
    input.code,
    totpSecret,
    verifiedAt,
  );

  if (matchedCounter === null) {
    try {
      await recordAdminTotpFailure(input.databaseUrl, input.userId, verifiedAt);
    } catch {
      return {
        reasonCode: "failure_state_unavailable",
        status: "unavailable",
      };
    }

    return { reasonCode: "invalid_code", status: "invalid" };
  }

  let consumed: boolean;

  try {
    consumed = await consumeAdminTotpCounter(
      input.databaseUrl,
      {
        counter: matchedCounter,
        sessionId: input.sessionId,
        userId: input.userId,
      },
      verifiedAt,
    );
  } catch {
    return {
      reasonCode: "counter_state_unavailable",
      status: "unavailable",
    };
  }

  if (!consumed) {
    return { reasonCode: "replayed", status: "replayed" };
  }

  return {
    enrollmentPending: factor.verified !== true,
    status: "accepted",
    verifiedAt,
  };
}
