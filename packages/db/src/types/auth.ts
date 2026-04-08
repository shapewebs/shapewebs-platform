import type { AdminRole } from "@shapewebs/config";
import type { LocaleCode } from "@shapewebs/i18n";

export type AdminProfile = {
  authUserId: string;
  defaultLocale: LocaleCode;
  displayName: string;
  id: string;
  status: "invited" | "active" | "suspended" | "revoked";
};

export type AdminSessionContext = {
  aal?: "aal1" | "aal2";
  nextAal?: "aal1" | "aal2";
  profile: AdminProfile;
  roles: AdminRole[];
  sessionId?: string;
  userEmail?: string;
  userId: string;
};

export type PreviewTokenPayload = {
  expiresAt: string;
  previewPath: string;
  revisionId: string;
  signature: string;
  token: string;
};
