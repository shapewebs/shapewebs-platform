import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getAdminRuntimeState } from "@/lib/auth";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { MfaScreen } from "./mfa-screen";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [runtime, query] = await Promise.all([
    getAdminRuntimeState(),
    searchParams,
  ]);
  const pendingPassword = query.pending === "password";

  if (
    runtime.authenticationAvailable &&
    !runtime.primarySession &&
    !pendingPassword
  ) {
    redirect("/login?error=unauthorized");
  }

  return (
    <Suspense fallback={null}>
      <MfaScreen
        isConfigured={hasAdminAuthConfig()}
        twoFactorEnabled={
          pendingPassword ||
          (runtime.primarySession?.user.twoFactorEnabled ?? false)
        }
      />
    </Suspense>
  );
}
