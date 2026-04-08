import type { AdminSessionContext } from "../types/auth";

function toRoleArray(data: unknown): AdminSessionContext["roles"] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) =>
      item === "owner" || item === "admin" || item === "editor" || item === "reviewer"
        ? item
        : null,
    )
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

export async function getAuthenticatorAssurance(
  supabase: any,
) {
  const response = await (supabase.auth.mfa as never as {
    getAuthenticatorAssuranceLevel: () => Promise<{
      data: {
        currentLevel?: "aal1" | "aal2";
        nextLevel?: "aal1" | "aal2";
      };
      error: { message: string } | null;
    }>;
  }).getAuthenticatorAssuranceLevel();

  return response;
}

export async function getAdminSessionContext(
  supabase: any,
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
      defaultLocale: data.default_locale as AdminSessionContext["profile"]["defaultLocale"],
      displayName: data.display_name,
      status,
    },
    roles: toRoleArray(data.roles),
    aal: assuranceData.currentLevel,
    nextAal: assuranceData.nextLevel,
  };
}
