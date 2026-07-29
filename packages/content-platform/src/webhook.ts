import "server-only";

import { isValidSignature, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import {
  sanityWebhookPayloadSchema,
  type SanityWebhookPayload,
} from "@shapewebs/content-schema";

export const sanityWebhookSignatureHeader = SIGNATURE_HEADER_NAME;
export const maximumSanityWebhookBodyBytes = 32 * 1_024;

export class SanityWebhookError extends Error {
  readonly code:
    | "body_invalid"
    | "body_too_large"
    | "signature_invalid"
    | "signature_missing";

  constructor(code: SanityWebhookError["code"]) {
    super("The Sanity webhook did not satisfy the Shapewebs contract.");
    this.code = code;
    this.name = "SanityWebhookError";
  }
}

export async function verifySanityWebhook(input: {
  rawBody: string;
  secret: string;
  signature: string | null;
}): Promise<SanityWebhookPayload> {
  const byteLength = Buffer.byteLength(input.rawBody, "utf8");

  if (byteLength > maximumSanityWebhookBodyBytes) {
    throw new SanityWebhookError("body_too_large");
  }

  if (
    !input.signature ||
    input.signature.length > 512 ||
    /[\u0000-\u001f\u007f]/u.test(input.signature)
  ) {
    throw new SanityWebhookError("signature_missing");
  }

  if (!(await isValidSignature(input.rawBody, input.signature, input.secret))) {
    throw new SanityWebhookError("signature_invalid");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(input.rawBody) as unknown;
  } catch {
    throw new SanityWebhookError("body_invalid");
  }

  const result = sanityWebhookPayloadSchema.safeParse(payload);

  if (!result.success) {
    throw new SanityWebhookError("body_invalid");
  }

  return result.data;
}
