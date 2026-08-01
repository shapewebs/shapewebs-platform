import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getAdminRuntimeState } from "@/lib/auth";

export default async function AccountPortalIndexPage() {
  await connection();

  const runtime = await getAdminRuntimeState();

  if (
    !runtime.authenticationAvailable ||
    runtime.setupMode ||
    !runtime.primarySession
  ) {
    redirect("/login");
  }

  if (runtime.authorization) {
    redirect("/dashboard");
  }

  if (runtime.customerAuthorization) {
    redirect("/customer");
  }

  redirect("/login?error=unauthorized");
}
