import {
  renderLeadHtml,
  renderLeadText,
  type LeadTemplateInput,
} from "./lead-template";

export type LeadNotification = LeadTemplateInput & {
  from: string;
  idempotencyKey: string;
  replyTo: string;
  to: string;
};

export type EmailDeliveryResult =
  | {
      providerMessageId: string;
      status: "sent";
    }
  | {
      errorCode: string;
      status: "permanent_failure" | "retryable";
    };

type FetchImplementation = typeof fetch;

function isRetryableStatus(status: number): boolean {
  return [408, 409, 425, 429].includes(status) || status >= 500;
}

export async function sendLeadNotification(
  apiKey: string,
  input: LeadNotification,
  options?: {
    fetchImplementation?: FetchImplementation;
    timeoutMs?: number;
  },
): Promise<EmailDeliveryResult> {
  const fetchImplementation = options?.fetchImplementation ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 5_000,
  );

  try {
    const response = await fetchImplementation(
      "https://api.resend.com/emails",
      {
        body: JSON.stringify({
          from: input.from,
          html: renderLeadHtml(input),
          reply_to: input.replyTo,
          subject:
            input.kind === "project_inquiry"
              ? "New Shapewebs project inquiry"
              : "New Shapewebs contact submission",
          tags: [
            {
              name: "source",
              value: "shapewebs-lead",
            },
          ],
          text: renderLeadText(input),
          to: [input.to],
        }),
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        method: "POST",
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return {
        errorCode: `resend_http_${response.status}`,
        status: isRetryableStatus(response.status)
          ? "retryable"
          : "permanent_failure",
      };
    }

    const body = (await response.json()) as { id?: unknown };

    if (typeof body.id !== "string" || !body.id) {
      return {
        errorCode: "resend_invalid_response",
        status: "retryable",
      };
    }

    return {
      providerMessageId: body.id,
      status: "sent",
    };
  } catch {
    return {
      errorCode: "resend_network_error",
      status: "retryable",
    };
  } finally {
    clearTimeout(timeout);
  }
}
