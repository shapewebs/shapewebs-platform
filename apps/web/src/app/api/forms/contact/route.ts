import { NextRequest } from "next/server";
import {
  buildRateLimitKey,
  consumeRateLimit,
  createLeadResponse,
  getClientIp,
  getIdempotencyKey,
  parseContactPayload,
  readJsonRequest,
  storeContactSubmission,
  verifyTurnstileToken,
} from "@/lib/forms";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const respond = (
    body: { error: string } | { message: string },
    status: number,
    result: "denied" | "failure" | "success",
    reasonCode: string,
  ) =>
    createLeadResponse(request, {
      body,
      formType: "contact",
      reasonCode,
      result,
      startedAt,
      status,
    });
  const idempotencyKey = getIdempotencyKey(request.headers);
  if (!idempotencyKey) {
    return respond(
      { error: "A valid idempotency key is required." },
      400,
      "denied",
      "invalid_idempotency_key",
    );
  }

  const requestBody = await readJsonRequest(request);
  if (requestBody.status !== "ok") {
    const status =
      requestBody.status === "too_large"
        ? 413
        : requestBody.status === "unsupported"
          ? 415
          : 400;
    return respond(
      { error: "The contact form request is invalid." },
      status,
      "denied",
      `request_${requestBody.status}`,
    );
  }

  let payload: ReturnType<typeof parseContactPayload>;

  try {
    payload = parseContactPayload(requestBody.value);
  } catch {
    return respond(
      { error: "The contact form payload is invalid." },
      400,
      "denied",
      "payload_invalid",
    );
  }

  const ip = getClientIp(request.headers);
  const rateLimit = consumeRateLimit(
    buildRateLimitKey("contact", ip, payload.email),
  );

  if (!rateLimit.allowed) {
    return respond(
      { error: "Too many requests. Please wait and try again." },
      429,
      "denied",
      "rate_limited",
    );
  }

  const captcha = await verifyTurnstileToken({
    idempotencyKey,
    ip,
    token: request.headers.get("x-turnstile-token"),
  });

  if (!captcha.success) {
    return respond(
      {
        error:
          captcha.mode === "unconfigured"
            ? "The contact form is temporarily unavailable."
            : "Captcha verification failed.",
      },
      captcha.mode === "unconfigured" ? 503 : 400,
      captcha.mode === "unconfigured" ? "failure" : "denied",
      captcha.mode === "unconfigured"
        ? "captcha_unavailable"
        : "captcha_invalid",
    );
  }

  let submission: Awaited<ReturnType<typeof storeContactSubmission>>;

  try {
    submission = await storeContactSubmission({
      commandId: idempotencyKey,
      formType: "contact",
      ip,
      payload,
    });
  } catch {
    return respond(
      { error: "The contact form is temporarily unavailable." },
      503,
      "failure",
      "persistence_failed",
    );
  }

  if (submission.status === "unconfigured") {
    return respond(
      { error: "The contact form is temporarily unavailable." },
      503,
      "failure",
      "persistence_unconfigured",
    );
  }

  if (submission.status === "idempotency_conflict") {
    return respond(
      { error: "The idempotency key was already used for another request." },
      409,
      "denied",
      "idempotency_conflict",
    );
  }

  return respond(
    { message: "Thanks, your message has been received." },
    200,
    "success",
    "committed",
  );
}
