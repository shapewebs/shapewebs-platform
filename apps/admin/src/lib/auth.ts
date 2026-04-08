import { redirect } from "next/navigation";
import {
  getAdminSessionContext,
  type AdminSessionContext,
} from "@shapewebs/db";
import type { AdminRole } from "@shapewebs/config";
import { getAdminServerSupabaseClient, hasAdminSupabaseConfig } from "./supabase";

type AdminRuntimeState = {
  session: AdminSessionContext | null;
  setupMode: boolean;
  supabase: Awaited<ReturnType<typeof getAdminServerSupabaseClient>>;
};

function sanitizeRedirectTarget(redirectTo?: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return "/dashboard";
  }

  return redirectTo;
}

export async function getAdminRuntimeState(): Promise<AdminRuntimeState> {
  const setupMode = !hasAdminSupabaseConfig();
  const supabase = await getAdminServerSupabaseClient();

  if (setupMode || !supabase) {
    return {
      session: null,
      setupMode: true,
      supabase,
    };
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
  if (!session || session.profile.status !== "active" || session.roles.length === 0) {
    redirect(`/login?redirectTo=${encodeURIComponent(sanitizeRedirectTarget(options?.redirectTo))}`);
  }

  if (session.nextAal === "aal2" && session.aal !== "aal2") {
    redirect(`/login/mfa?redirectTo=${encodeURIComponent(sanitizeRedirectTarget(options?.redirectTo))}`);
  }

  if (options?.roles?.length) {
    const hasAnyRole = options.roles.some((role) => session.roles.includes(role));

    if (!hasAnyRole) {
      redirect("/dashboard?error=forbidden");
    }
  }

  return runtime;
}

export function getSafeRedirectTarget(redirectTo?: string | null) {
  return sanitizeRedirectTarget(redirectTo);
}
