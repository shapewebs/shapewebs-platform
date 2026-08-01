import {
  completeCustomerPasswordRegistration as completeCustomerPasswordRegistrationInDatabase,
  createCustomerInvitation as createCustomerInvitationInDatabase,
  exchangeCustomerInvitationToken as exchangeCustomerInvitationTokenInDatabase,
  registerCustomerWithPassword as registerCustomerWithPasswordInDatabase,
  type AdminAuthorizationContext,
  type CustomerInvitationReceipt,
} from "@shapewebs/database/server";
import { emailAddressSchema } from "@shapewebs/validation";
import {
  assertCustomerPasswordNotCompromised,
  hashCustomerPassword,
} from "./customer-password";
import { encryptAdminEmailToken } from "./admin-email-token";
import {
  generateCustomerBearerToken,
  hashCustomerBearerToken,
  isCustomerBearerToken,
} from "./customer-tokens";

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1_000;
const registrationGrantLifetimeMs = 30 * 60 * 1_000;
const verificationLifetimeMs = 60 * 60 * 1_000;
const customerNamePattern = /^[^\u0000-\u001f\u007f]{1,120}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PasswordAssurance = (password: string) => Promise<void> | void;
function normalizeCustomerEmail(email: string): string {
  const parsed = emailAddressSchema.safeParse(email.trim().toLowerCase());

  if (!parsed.success) {
    throw new Error("The customer email address is invalid.");
  }

  return parsed.data;
}

function normalizeCustomerName(name: string): string {
  const normalized = name.trim();

  if (!customerNamePattern.test(normalized)) {
    throw new Error("The customer name is invalid.");
  }

  return normalized;
}

function assertEncryptionSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error("The account email encryption secret is too short.");
  }
}

export async function createCustomerInvitation(input: {
  authorization: AdminAuthorizationContext;
  databaseUrl: string;
  email: string;
  encryptionSecret: string;
  name: string;
  now?: Date;
  projectIds: string[];
}): Promise<{ expiresAt: Date; invitationId: string }> {
  assertEncryptionSecret(input.encryptionSecret);
  const email = normalizeCustomerEmail(input.email);
  const name = normalizeCustomerName(input.name);

  if (
    input.projectIds.length < 1 ||
    input.projectIds.length > 100 ||
    input.projectIds.some((projectId) => !uuidPattern.test(projectId))
  ) {
    throw new Error("The customer project assignment is invalid.");
  }

  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + invitationLifetimeMs);
  const token = generateCustomerBearerToken();
  const tokenHash = await hashCustomerBearerToken(token);
  const encryptedToken = await encryptAdminEmailToken(
    token,
    input.encryptionSecret,
    Math.floor(invitationLifetimeMs / 1_000),
  );
  const receipt = await createCustomerInvitationInDatabase(input.databaseUrl, {
    authorization: input.authorization,
    email,
    encryptedToken,
    expiresAt,
    idempotencyKey: `customer.invitation/${tokenHash}`,
    name,
    projectIds: [...new Set(input.projectIds)],
    tokenHash,
  });

  return { expiresAt, invitationId: receipt.invitationId };
}

export async function activateCustomerInvitation(input: {
  databaseUrl: string;
  invitationToken: string;
  now?: Date;
}): Promise<
  (CustomerInvitationReceipt & { registrationGrant: string }) | null
> {
  if (!isCustomerBearerToken(input.invitationToken)) {
    return null;
  }

  const invitationTokenHash = await hashCustomerBearerToken(
    input.invitationToken,
  );
  const registrationGrant = generateCustomerBearerToken();
  const registrationGrantHash =
    await hashCustomerBearerToken(registrationGrant);
  const registrationGrantExpiresAt = new Date(
    (input.now ?? new Date()).getTime() + registrationGrantLifetimeMs,
  );
  const receipt = await exchangeCustomerInvitationTokenInDatabase(
    input.databaseUrl,
    {
      invitationTokenHash,
      registrationGrantExpiresAt,
      registrationGrantHash,
    },
  );

  return receipt ? { ...receipt, registrationGrant } : null;
}

export async function beginCustomerPasswordRegistration(input: {
  databaseUrl: string;
  email: string;
  encryptionSecret: string;
  name: string;
  now?: Date;
  password: string;
  passwordAssurance?: PasswordAssurance;
  registrationGrant: string;
}): Promise<{ status: "verification_required" }> {
  assertEncryptionSecret(input.encryptionSecret);

  if (!isCustomerBearerToken(input.registrationGrant)) {
    throw new Error("The customer registration grant is invalid.");
  }

  const email = normalizeCustomerEmail(input.email);
  const name = normalizeCustomerName(input.name);
  await (input.passwordAssurance ?? assertCustomerPasswordNotCompromised)(
    input.password,
  );

  const now = input.now ?? new Date();
  const verificationExpiresAt = new Date(
    now.getTime() + verificationLifetimeMs,
  );
  const verificationToken = generateCustomerBearerToken();
  const verificationTokenHash =
    await hashCustomerBearerToken(verificationToken);
  const encryptedVerificationToken = await encryptAdminEmailToken(
    verificationToken,
    input.encryptionSecret,
    Math.floor(verificationLifetimeMs / 1_000),
  );
  const receipt = await registerCustomerWithPasswordInDatabase(
    input.databaseUrl,
    {
      accountId: generateCustomerBearerToken(),
      email,
      encryptedVerificationToken,
      name,
      passwordHash: await hashCustomerPassword(input.password),
      registrationGrantHash: await hashCustomerBearerToken(
        input.registrationGrant,
      ),
      userId: generateCustomerBearerToken(),
      verificationExpiresAt,
      verificationIdempotencyKey: `customer.email_verification/${verificationTokenHash}`,
      verificationTokenHash,
    },
  );

  if (!receipt) {
    throw new Error("The customer registration could not be committed.");
  }

  return { status: "verification_required" };
}

export async function confirmCustomerPasswordRegistration(input: {
  databaseUrl: string;
  finalPassword: string;
  passwordAssurance?: PasswordAssurance;
  verificationToken: string;
}): Promise<{ status: "active" } | null> {
  if (!isCustomerBearerToken(input.verificationToken)) {
    return null;
  }

  await (input.passwordAssurance ?? assertCustomerPasswordNotCompromised)(
    input.finalPassword,
  );
  const receipt = await completeCustomerPasswordRegistrationInDatabase(
    input.databaseUrl,
    {
      finalPasswordHash: await hashCustomerPassword(input.finalPassword),
      verificationTokenHash: await hashCustomerBearerToken(
        input.verificationToken,
      ),
    },
  );

  return receipt ? { status: "active" } : null;
}
