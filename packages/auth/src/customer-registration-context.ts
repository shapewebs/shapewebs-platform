import { symmetricDecodeJWT, symmetricEncodeJWT } from "better-auth/crypto";
import { emailAddressSchema } from "@shapewebs/validation";

const registrationContextSalt = "shapewebs/customer-registration-context/v1";
const registrationContextLifetimeSeconds = 30 * 60;
const customerNamePattern = /^[^\u0000-\u001f\u007f]{1,120}$/;

export type CustomerRegistrationContext = {
  email: string;
  name: string;
};

function normalizeContext(
  input: CustomerRegistrationContext,
): CustomerRegistrationContext {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (
    !emailAddressSchema.safeParse(email).success ||
    !customerNamePattern.test(name)
  ) {
    throw new Error("The customer registration context is invalid.");
  }

  return { email, name };
}

export async function encryptCustomerRegistrationContext(
  input: CustomerRegistrationContext,
  encryptionSecret: string,
): Promise<string> {
  if (encryptionSecret.length < 32) {
    throw new Error(
      "PORTAL_AUTH_EMAIL_ENCRYPTION_SECRET must contain at least 32 characters.",
    );
  }

  return symmetricEncodeJWT(
    normalizeContext(input),
    encryptionSecret,
    registrationContextSalt,
    registrationContextLifetimeSeconds,
  );
}

export async function decryptCustomerRegistrationContext(
  encryptedContext: string,
  encryptionSecret: string,
): Promise<CustomerRegistrationContext | null> {
  if (encryptionSecret.length < 32 || encryptedContext.length > 8192) {
    return null;
  }

  try {
    const payload = await symmetricDecodeJWT<{
      email?: unknown;
      name?: unknown;
    }>(encryptedContext, encryptionSecret, registrationContextSalt);

    if (
      typeof payload?.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return normalizeContext({ email: payload.email, name: payload.name });
  } catch {
    return null;
  }
}
