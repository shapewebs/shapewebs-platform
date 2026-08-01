import {
  getAdminAuthEmailSubject,
  renderAdminAuthEmailHtml,
  renderAdminAuthEmailText,
  type AdminAuthEmailInput,
} from "./admin-auth-template";
import type { EmailDeliveryResult } from "./resend-delivery";

export type AdminAuthNotification = AdminAuthEmailInput & {
  from: string;
  idempotencyKey: string;
  to: string;
};

function isRetryableStatus(status: number): boolean {
  return [408, 409, 425, 429].includes(status) || status >= 500;
}

export async function sendAdminAuthNotification(
  apiKey: string,
  input: AdminAuthNotification,
  options: {
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<EmailDeliveryResult> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 5_000,
  );

  try {
    const response = await (options.fetchImplementation ?? fetch)(
      "https://api.resend.com/emails",
      {
        body: JSON.stringify({
          from: input.from,
          html: renderAdminAuthEmailHtml(input),
          subject: getAdminAuthEmailSubject(input.kind),
          tags: [
            { name: "source", value: "shapewebs-account-auth" },
            { name: "kind", value: input.kind },
          ],
          text: renderAdminAuthEmailText(input),
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
    return typeof body.id === "string" && body.id
      ? { providerMessageId: body.id, status: "sent" }
      : { errorCode: "resend_invalid_response", status: "retryable" };
  } catch {
    return { errorCode: "resend_network_error", status: "retryable" };
  } finally {
    clearTimeout(timeout);
  }
}
