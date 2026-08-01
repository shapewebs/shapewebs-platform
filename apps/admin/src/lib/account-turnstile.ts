import "server-only";

import { randomUUID } from "node:crypto";

import type { AccountTurnstileAction } from "./account-turnstile-contract";

const cloudflareAlwaysPassSiteKey = "1x00000000000000000000AA";
const cloudflareAlwaysPassSecretKey = "1x0000000000000000000000000000000AA";

export async function verifyAccountTurnstile(input: {
  action: AccountTurnstileAction;
  ip?: string | null;
  token: string | null;
}): Promise<boolean> {
  const expectedHostname = process.env.ACCOUNT_TURNSTILE_EXPECTED_HOSTNAME;
  const secret = process.env.ACCOUNT_TURNSTILE_SECRET_KEY;
  const siteKey = process.env.NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY;

  if (
    !expectedHostname ||
    !secret ||
    !siteKey ||
    !input.token ||
    input.token.length > 2_048
  ) {
    return false;
  }

  const testMode = process.env.ACCOUNT_TURNSTILE_TEST_MODE === "true";
  if (
    testMode &&
    (process.env.VERCEL_ENV === "production" ||
      siteKey !== cloudflareAlwaysPassSiteKey ||
      secret !== cloudflareAlwaysPassSecretKey)
  ) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      idempotency_key: randomUUID(),
      response: input.token,
      secret,
    });

    if (input.ip && input.ip.length <= 64) {
      body.set("remoteip", input.ip);
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body,
        cache: "no-store",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      action?: unknown;
      hostname?: unknown;
      success?: unknown;
    };

    return testMode
      ? payload.success === true &&
          payload.hostname === "example.com" &&
          payload.action == null
      : payload.success === true &&
          payload.hostname === expectedHostname &&
          payload.action === input.action;
  } catch {
    return false;
  }
}

export function getAccountRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0];
  const candidate =
    forwarded?.trim() || request.headers.get("x-real-ip")?.trim();

  return candidate && candidate.length <= 64 ? candidate : null;
}
