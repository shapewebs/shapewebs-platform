import type { AdminSessionContext } from "../types/auth";
import type { ShapewebsSupabaseClient } from "../supabase/shared";

function toRoleArray(data: unknown): AdminSessionContext["roles"] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) =>
      item === "owner" ||
      item === "admin" ||
      item === "editor" ||
      item === "reviewer"
        ? item
        : null,
    )
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

function toAssuranceLevel(value: unknown): "aal1" | "aal2" | undefined {
  return value === "aal1" || value === "aal2" ? value : undefined;
}

export async function getAuthenticatorAssurance(
  supabase: ShapewebsSupabaseClient,
) {
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel();
}

export async function getAdminSessionContext(
  supabase: ShapewebsSupabaseClient,
): Promise<AdminSessionContext | null> {
  const [{ data: userData }, { data: assuranceData }] = await Promise.all([
    supabase.auth.getUser(),
    getAuthenticatorAssurance(supabase),
  ]);

  const user = userData.user;

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .schema("cms")
    .rpc("get_current_admin_session")
    .single();

  if (error || !data) {
    return null;
  }

  const status = data.status;
  if (
    status !== "invited" &&
    status !== "active" &&
    status !== "suspended" &&
    status !== "revoked"
  ) {
    return null;
  }

  return {
    userId: user.id,
    userEmail: user.email,
    sessionId: user.aud,
    profile: {
      id: data.profile_id,
      authUserId: data.auth_user_id,
      defaultLocale:
        data.default_locale as AdminSessionContext["profile"]["defaultLocale"],
      displayName: data.display_name,
      status,
    },
    roles: toRoleArray(data.roles),
    aal: toAssuranceLevel(assuranceData?.currentLevel),
    nextAal: toAssuranceLevel(assuranceData?.nextLevel),
  };
}
