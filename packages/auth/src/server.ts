import "server-only";

export {
  findMatchingTotpCounter,
  verifyAdminTotpCode,
  type AdminTotpVerificationResult,
} from "./admin-totp";
export { createShapewebsAuth } from "./create-auth";
export { createShapewebsCustomerAuth } from "./create-customer-auth";
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
  type CustomerPasswordFailureCode,
} from "./customer-password";
export {
  clearCustomerRegistrationGrant,
  getCustomerCookiePolicy,
  getCustomerRegistrationCookieName,
  readCustomerRegistrationGrant,
  serializeCustomerRegistrationGrant,
} from "./customer-cookie";
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
