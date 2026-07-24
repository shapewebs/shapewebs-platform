import { redirect } from "next/navigation";
import {
  getAdminSessionContext,
  type AdminSessionContext,
} from "@shapewebs/db";
import type { AdminRole } from "@shapewebs/config";
import {
  getAdminServerSupabaseClient,
  hasAdminSupabaseConfig,
  isLocalAdminSetupMode,
} from "./supabase";
import { getSafeAdminRedirectTarget } from "./redirect";

type AdminRuntimeState = {
  session: AdminSessionContext | null;
  setupMode: boolean;
  supabase: Awaited<ReturnType<typeof getAdminServerSupabaseClient>>;
};

export async function getAdminRuntimeState(): Promise<AdminRuntimeState> {
  const isConfigured = hasAdminSupabaseConfig();
  const setupMode = isLocalAdminSetupMode();
  const supabase = isConfigured ? await getAdminServerSupabaseClient() : null;

  if (setupMode) {
    return {
      session: null,
      setupMode: true,
      supabase,
    };
  }

  if (!supabase) {
    throw new Error(
      "Admin authentication is unavailable because its required configuration is missing.",
    );
  }

  return {
    session: await getAdminSessionContext(supabase),
    setupMode: false,
    supabase,
  };
}

export async function requireAdminSession(options?: {
  redirectTo?: string;
  roles?: AdminRole[];
}) {
  const runtime = await getAdminRuntimeState();

  if (runtime.setupMode) {
    return runtime;
  }

  const session = runtime.session;
  if (
    !session ||
    session.profile.status !== "active" ||
    session.roles.length === 0
  ) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(getSafeAdminRedirectTarget(options?.redirectTo))}`,
    );
  }

  if (session.nextAal === "aal2" && session.aal !== "aal2") {
    redirect(
      `/login/mfa?redirectTo=${encodeURIComponent(getSafeAdminRedirectTarget(options?.redirectTo))}`,
    );
  }

  if (options?.roles?.length) {
    const hasAnyRole = options.roles.some((role) =>
      session.roles.includes(role),
    );

    if (!hasAnyRole) {
      redirect("/dashboard?error=forbidden");
    }
  }

  return runtime;
}
