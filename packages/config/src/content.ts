export const contentTypes = [
  "page",
  "post",
  "project",
  "service",
  "method",
  "legal",
] as const;

export const contentStates = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
] as const;

export const adminRoles = ["owner", "admin", "editor", "reviewer"] as const;

export const consentCategories = [
  "necessary",
  "preferences",
  "analytics",
  "marketing",
] as const;

export type ContentType = (typeof contentTypes)[number];
export type ContentState = (typeof contentStates)[number];
export type AdminRole = (typeof adminRoles)[number];
export type ConsentCategory = (typeof consentCategories)[number];
