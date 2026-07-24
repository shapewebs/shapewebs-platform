const cloudflareAlwaysPassSiteKey = "1x00000000000000000000AA";
const cloudflareAlwaysPassSecretKey = "1x0000000000000000000000000000000AA";

type TurnstileVerificationPayload = {
  action?: unknown;
  hostname?: unknown;
  success?: unknown;
};

export function isTurnstileVerificationAccepted(input: {
  environment?: Record<string, string | undefined>;
  expectedHostname: string;
  payload: TurnstileVerificationPayload;
  secret: string;
}) {
  const testMode = input.environment?.TURNSTILE_TEST_MODE === "true";

  if (testMode) {
    return (
      input.environment?.VERCEL_ENV !== "production" &&
      input.environment?.NEXT_PUBLIC_TURNSTILE_SITE_KEY ===
        cloudflareAlwaysPassSiteKey &&
      input.secret === cloudflareAlwaysPassSecretKey &&
      input.payload.success === true &&
      input.payload.hostname === "example.com" &&
      input.payload.action == null
    );
  }

  return (
    input.payload.success === true &&
    input.payload.hostname === input.expectedHostname &&
    input.payload.action === "lead_submission"
  );
}
