export type LeadTemplateInput = {
  adminBaseUrl: string;
  email: string;
  kind: "contact" | "project_inquiry";
  leadId: string;
  name: string;
};

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function leadUrl(input: LeadTemplateInput): string {
  const url = new URL("/submissions", input.adminBaseUrl);
  url.searchParams.set("lead", input.leadId);
  return url.toString();
}

export function renderLeadHtml(input: LeadTemplateInput): string {
  const url = leadUrl(input);

  return [
    `<h1>${input.kind === "project_inquiry" ? "Project inquiry" : "Contact submission"}</h1>`,
    `<p><strong>Name:</strong> ${escapeEmailHtml(input.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeEmailHtml(input.email)}</p>`,
    `<p><strong>Submission:</strong> ${escapeEmailHtml(input.leadId)}</p>`,
    `<p><a href="${escapeEmailHtml(url)}">Open the protected submission</a></p>`,
  ].join("");
}

export function renderLeadText(input: LeadTemplateInput): string {
  return [
    input.kind === "project_inquiry" ? "Project inquiry" : "Contact submission",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Submission: ${input.leadId}`,
    "",
    `Open the protected submission: ${leadUrl(input)}`,
  ].join("\n");
}
