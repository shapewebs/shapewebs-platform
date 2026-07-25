import "server-only";

export {
  findMatchingTotpCounter,
  verifyAdminTotpCode,
  type AdminTotpVerificationResult,
} from "./admin-totp";
export { createShapewebsAuth } from "./create-auth";
export {
  generateAdminSessionToken,
  serializeAdminSessionCookie,
} from "./session-cookie";
export { toNextJsHandler } from "better-auth/next-js";
export type {
  GoogleOAuthCredentials,
  ShapewebsAuthOptions,
} from "./create-auth";
