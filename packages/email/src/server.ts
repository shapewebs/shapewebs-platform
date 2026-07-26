import "server-only";

import { Resend, type WebhookEventPayload } from "resend";
import { escapeEmailHtml } from "./lead-template";

export { escapeEmailHtml };
export {
  getAdminAuthActionUrl,
  getAdminAuthEmailSubject,
  renderAdminAuthEmailHtml,
  renderAdminAuthEmailText,
  type AdminAuthEmailInput,
} from "./admin-auth-template";
export {
  sendAdminAuthNotification,
  type AdminAuthNotification,
} from "./admin-auth-delivery";
export {
  getCustomerAuthActionUrl,
  getCustomerAuthEmailSubject,
  renderCustomerAuthEmailHtml,
  renderCustomerAuthEmailText,
  type CustomerAuthEmailInput,
} from "./customer-auth-template";
export {
  sendCustomerAuthNotification,
  type CustomerAuthNotification,
} from "./customer-auth-delivery";
export {
  sendLeadNotification,
  type EmailDeliveryResult,
  type LeadNotification,
} from "./resend-delivery";

export function verifyResendWebhook(input: {
  id: string;
  payload: string;
  signature: string;
  timestamp: string;
  webhookSecret: string;
}): WebhookEventPayload {
  return new Resend().webhooks.verify({
    headers: {
      id: input.id,
      signature: input.signature,
      timestamp: input.timestamp,
    },
    payload: input.payload,
    webhookSecret: input.webhookSecret,
  });
}
