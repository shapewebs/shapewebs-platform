import { createHash, createHmac, randomUUID } from "node:crypto";
import { submitLeadWithOutbox } from "@shapewebs/database/server";
import {
  createStructuredLogger,
  resolveShapewebsEnvironment,
} from "@shapewebs/observability";
import {
  contactFormSchema,
  projectInquirySchema,
  readBoundedText,
  type ContactFormInput,
  type ProjectInquiryInput,
} from "@shapewebs/validation";
import { isTurnstileVerificationAccepted } from "./turnstile";

export { consumeRateLimit } from "./rate-limit";
export { getClientIp } from "./request-identity";

const maximumRequestBytes = 16 * 1_024;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const logger = createStructuredLogger({
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  environment: resolveShapewebsEnvironment(),
  service: "shapewebs-web",
});

export function createLeadResponse(
  request: Request,
  input: {
    body: { error: string } | { message: string };
    formType: "contact" | "project_inquiry";
    reasonCode: string;
    result: "denied" | "failure" | "success";
    startedAt: number;
    status: number;
  },
) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  logger.log({
    durationMs: Date.now() - input.startedAt,
    eventCode: "shapewebs.lead.acceptance",
    level:
      input.result === "success"
        ? "info"
        : input.result === "failure"
          ? "error"
          : "warn",
    metadata: {
      httpStatus: input.status,
      operation: input.formType,
      reasonCode: input.reasonCode,
      resourceType: "lead",
    },
    requestId,
    result: input.result,
  });

  return Response.json(input.body, {
    headers: {
      "Cache-Control": "no-store",
      "x-request-id": requestId,
    },
    status: input.status,
  });
}

function getHashedIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getIdempotencyKey(headers: Headers): string | null {
  const value = headers.get("idempotency-key")?.trim();
  return value && uuidPattern.test(value) ? value : null;
}

export async function readJsonRequest(request: Request): Promise<
  | {
      status: "ok";
      value: unknown;
    }
  | {
      status: "invalid" | "too_large" | "unsupported";
    }
> {
  if (
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    return { status: "unsupported" };
  }

  const rawBody = await readBoundedText(request, maximumRequestBytes);
  if (rawBody.status !== "ok") {
    return { status: "too_large" };
  }

  try {
    return {
      status: "ok",
      value: JSON.parse(rawBody.value) as unknown,
    };
  } catch {
    return { status: "invalid" };
  }
}

export async function verifyTurnstileToken(input: {
  idempotencyKey: string;
  ip: string;
  token?: string | null;
}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const expectedHostname = process.env.TURNSTILE_EXPECTED_HOSTNAME;

  if (!secret || !expectedHostname) {
    if (process.env.NODE_ENV !== "development") {
      return {
        mode: "unconfigured" as const,
        success: false,
      };
    }

    return {
      mode: "skipped" as const,
      success: true,
    };
  }

  if (!input.token || input.token.length > 2_048) {
    return {
      mode: "enforced" as const,
      success: false,
    };
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body: new URLSearchParams({
          idempotency_key: input.idempotencyKey,
          remoteip: input.ip,
          response: input.token,
          secret,
        }),
        cache: "no-store",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        method: "POST",
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!response.ok) {
      return {
        mode: "enforced" as const,
        success: false,
      };
    }

    const payload = (await response.json()) as {
      action?: unknown;
      hostname?: unknown;
      success?: unknown;
    };

    return {
      mode: "enforced" as const,
      success: isTurnstileVerificationAccepted({
        environment: process.env,
        expectedHostname,
        payload,
        secret,
      }),
    };
  } catch {
    return {
      mode: "enforced" as const,
      success: false,
    };
  }
}

function getLeadPayload(
  input: ContactFormInput | ProjectInquiryInput,
): Record<string, unknown> {
  return {
    budgetBand: "budgetBand" in input ? input.budgetBand : undefined,
    company: input.company,
    consentAccepted: input.consentAccepted,
    localeCode: input.localeCode,
    serviceInterest:
      "serviceInterest" in input ? input.serviceInterest : undefined,
    timeline: "timeline" in input ? input.timeline : undefined,
  };
}

function requestFingerprint(input: {
  formType: "contact" | "project_inquiry";
  payload: ContactFormInput | ProjectInquiryInput;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        email: input.payload.email.toLowerCase(),
        formType: input.formType,
        message: input.payload.message,
        name: input.payload.name,
        payload: getLeadPayload(input.payload),
      }),
    )
    .digest("hex");
}

export async function storeContactSubmission(input: {
  commandId: string;
  formType: "contact" | "project_inquiry";
  ip: string;
  payload: ContactFormInput | ProjectInquiryInput;
}) {
  const databaseUrl = process.env.DATABASE_URL;
  const organizationId = process.env.SHAPEWEBS_ORGANIZATION_ID;
  const ipHashSecret = process.env.LEAD_IP_HASH_SECRET;

  if (!databaseUrl || !organizationId || !ipHashSecret) {
    return {
      status: "unconfigured" as const,
    };
  }

  const sourceIpHash = createHmac("sha256", ipHashSecret)
    .update(input.ip)
    .digest("base64url");

  return submitLeadWithOutbox(databaseUrl, {
    commandId: input.commandId,
    email: input.payload.email.toLowerCase(),
    kind: input.formType,
    message: input.payload.message,
    name: input.payload.name,
    organizationId,
    payload: getLeadPayload(input.payload),
    requestFingerprint: requestFingerprint(input),
    sourceIpHash,
  });
}

export function parseContactPayload(value: unknown) {
  return contactFormSchema.parse(value);
}

export function parseProjectInquiryPayload(value: unknown) {
  return projectInquirySchema.parse(value);
}

export function buildRateLimitKey(formType: string, ip: string, email: string) {
  return `${formType}:${getHashedIdentifier(`${ip}:${email.toLowerCase()}`)}`;
}
