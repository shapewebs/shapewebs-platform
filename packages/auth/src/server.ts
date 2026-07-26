import "server-only";

export {
  findMatchingTotpCounter,
  verifyAdminTotpCode,
  type AdminTotpVerificationResult,
} from "./admin-totp";
export {
  decryptAdminEmailToken,
  encryptAdminEmailToken,
  hashAdminEmailToken,
} from "./admin-email-token";
export {
  createAdminMethodAuthorization,
  verifyAdminMethodAuthorization,
} from "./admin-method-authorization";
export { verifyAdminPasswordHash } from "./admin-password";
export { createShapewebsAuth } from "./create-auth";
export { createShapewebsCustomerAuth } from "./create-customer-auth";
export {
  createCustomerMethodAuthorization,
  verifyCustomerMethodAuthorization,
} from "./customer-method-authorization";
export {
  activateCustomerInvitation,
  beginCustomerPasswordRegistration,
  confirmCustomerPasswordRegistration,
  createCustomerInvitation,
} from "./customer-onboarding";
export {
  assertCustomerPasswordNotCompromised,
  assertCustomerPasswordPolicy,
  customerPasswordPolicy,
  CustomerPasswordError,
  hashCustomerPassword,
  verifyCustomerPasswordHash,
  type CustomerPasswordFailureCode,
} from "./customer-password";
export {
  clearCustomerRegistrationContext,
  clearCustomerRegistrationGrant,
  getCustomerCookiePolicy,
  getCustomerRegistrationContextCookieName,
  getCustomerRegistrationCookieName,
  readCustomerRegistrationGrant,
  serializeCustomerRegistrationContext,
  serializeCustomerRegistrationGrant,
} from "./customer-cookie";
export {
  decryptCustomerRegistrationContext,
  encryptCustomerRegistrationContext,
  type CustomerRegistrationContext,
} from "./customer-registration-context";
export {
  decryptCustomerEmailToken,
  encryptCustomerEmailToken,
  generateCustomerBearerToken,
  hashCustomerBearerToken,
  hashCustomerOpaqueToken,
  isCustomerBearerToken,
} from "./customer-tokens";
export {
  generateAdminSessionToken,
  serializeAdminSessionCookie,
  serializeAdminSessionDeletionCookie,
} from "./session-cookie";
export { toNextJsHandler } from "better-auth/next-js";
export type {
  GoogleOAuthCredentials,
  ShapewebsAuthOptions,
} from "./create-auth";
export type {
  CustomerGoogleOAuthCredentials,
  ShapewebsCustomerAuthOptions,
} from "./create-customer-auth";
