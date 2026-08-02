import { headers } from "next/headers";
import { connection } from "next/server";
import type { Metadata } from "next";

import { AdminAuthShell } from "@/components/admin-auth-shell";
import { hasAdminAuthConfig } from "@/lib/better-auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Set or recover password",
};

export default async function ForgotPasswordPage() {
  await connection();
  const requestHeaders = await headers();

  return (
    <AdminAuthShell
      description={null}
      minimal
      title="Set or recover a password"
    >
      <ForgotPasswordForm
        isConfigured={hasAdminAuthConfig()}
        nonce={requestHeaders.get("x-nonce") ?? ""}
        siteKey={process.env.NEXT_PUBLIC_ACCOUNT_TURNSTILE_SITE_KEY ?? ""}
      />
    </AdminAuthShell>
  );
}
