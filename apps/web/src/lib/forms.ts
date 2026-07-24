import { createHash } from "node:crypto";
import {
  createAdminSupabaseClient,
  createContactSubmission,
} from "@shapewebs/db";
import {
  contactFormSchema,
  projectInquirySchema,
  type ContactFormInput,
  type ProjectInquiryInput,
} from "@shapewebs/validation";
export { consumeRateLimit } from "./rate-limit";

function getHashedIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export async function verifyTurnstileToken(input: {
  ip: string;
  token?: string | null;
}) {
  if (!process.env.TURNSTILE_SECRET_KEY) {
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

  if (!input.token) {
    return {
      mode: "enforced" as const,
      success: false,
    };
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: input.token,
        remoteip: input.ip,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return {
      mode: "enforced" as const,
      success: false,
    };
  }

  const payload = (await response.json()) as {
    success?: boolean;
  };

  return {
    mode: "enforced" as const,
    success: payload.success === true,
  };
}

export async function sendSubmissionNotification(input: {
  formType: "contact" | "project_inquiry";
  payload: ContactFormInput | ProjectInquiryInput;
}) {
  if (!process.env.RESEND_API_KEY) {
    return {
      sent: false,
    };
  }

  const projectFields =
    input.formType === "project_inquiry" && "budgetBand" in input.payload
      ? `
          <p><strong>Budget:</strong> ${escapeHtml(input.payload.budgetBand ?? "Not provided")}</p>
          <p><strong>Timeline:</strong> ${escapeHtml(input.payload.timeline ?? "Not provided")}</p>
          <p><strong>Service interest:</strong> ${escapeHtml(input.payload.serviceInterest ?? "Not provided")}</p>
        `
      : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Shapewebs <no-reply@shapewebs.com>",
      to: ["lukas@shapewebs.com"],
      subject:
        input.formType === "project_inquiry"
          ? "New Shapewebs project inquiry"
          : "New Shapewebs contact form submission",
      html: `
        <h1>${input.formType === "project_inquiry" ? "Project inquiry" : "Contact submission"}</h1>
        <p><strong>Name:</strong> ${escapeHtml(input.payload.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.payload.email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(input.payload.company ?? "Not provided")}</p>
        ${projectFields}
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(input.payload.message).replaceAll("\n", "<br>")}</p>
      `,
    }),
    cache: "no-store",
  });

  return {
    sent: response.ok,
  };
}

export async function storeContactSubmission(input: {
  countryCode?: string | null;
  formType: "contact" | "project_inquiry";
  payload: ContactFormInput | ProjectInquiryInput;
  spamScore?: number | null;
}) {
  const supabase = createAdminSupabaseClient();

  return createContactSubmission(supabase, input.payload, {
    formType: input.formType,
    countryCode: input.countryCode ?? null,
    spamScore: input.spamScore ?? null,
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
