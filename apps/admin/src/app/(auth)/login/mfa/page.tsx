import { Suspense } from "react";
import { requirePrimaryAdminSession } from "@/lib/auth";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { MfaScreen } from "./mfa-screen";

export default async function MfaPage() {
  const runtime = await requirePrimaryAdminSession("/dashboard");

  return (
    <Suspense fallback={null}>
      <MfaScreen
        isConfigured={hasAdminAuthConfig()}
        twoFactorEnabled={
          runtime.primarySession?.user.twoFactorEnabled ?? false
        }
      />
    </Suspense>
  );
}
