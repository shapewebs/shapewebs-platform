import type { ContactFormInput, ProjectInquiryInput } from "@shapewebs/validation";
function isConfigured(supabase: any): supabase is NonNullable<any> {
  return supabase !== null;
}

export async function createContactSubmission(
  supabase: any,
  input: ContactFormInput | ProjectInquiryInput,
  options: {
    formType: "contact" | "project_inquiry";
    countryCode?: string | null;
    spamScore?: number | null;
  },
) {
  if (!isConfigured(supabase)) {
    return {
      stored: false,
    };
  }

  const { data, error } = await supabase
    .schema("ops")
    .from("contact_submissions")
    .insert({
      form_type: options.formType,
      name: input.name,
      email: input.email,
      company: input.company ?? null,
      message: input.message,
      service_interest:
        "serviceInterest" in input ? input.serviceInterest ?? null : null,
      locale_code: input.localeCode,
      country_code: options.countryCode ?? null,
      consent_snapshot_json: {
        consentAccepted: input.consentAccepted,
      },
      spam_score: options.spamScore ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    stored: true,
    submissionId: data.id,
  };
}
