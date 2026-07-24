import "server-only";

export { createShapewebsAuth } from "./create-auth";
export { toNextJsHandler } from "better-auth/next-js";
export type {
  GoogleOAuthCredentials,
  ShapewebsAuthOptions,
} from "./create-auth";
