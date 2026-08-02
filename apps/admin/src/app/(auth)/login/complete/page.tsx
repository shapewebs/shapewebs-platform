import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getAdminRuntimeState } from "@/lib/auth";
import { getSafeAdminRedirectTarget } from "@/lib/redirect";

type LoginCompletionPageProps = Readonly<{
  searchParams: Promise<{
    redirectTo?: string;
  }>;
}>;

export default async function LoginCompletionPage({
  searchParams,
}: LoginCompletionPageProps) {
  await connection();

  const parameters = await searchParams;
  const redirectTo = getSafeAdminRedirectTarget(parameters.redirectTo);
  const runtime = await getAdminRuntimeState();

  if (
    !runtime.authenticationAvailable ||
    runtime.setupMode ||
    !runtime.primarySession
  ) {
    redirect(
      `/login?error=authentication&redirectTo=${encodeURIComponent(redirectTo)}`,
    );
  }

  if (
    runtime.customerAuthorization &&
    (redirectTo === "/customer" || redirectTo.startsWith("/customer/"))
  ) {
    redirect(redirectTo);
  }

  if (
    (runtime.authorization || runtime.customerAuthorization) &&
    (redirectTo === "/account" || redirectTo.startsWith("/account/"))
  ) {
    redirect(redirectTo);
  }

  if (runtime.authorization) {
    if (runtime.authorization.latestStepUpAt) {
      redirect(redirectTo);
    }

    redirect(`/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (runtime.customerAuthorization) {
    redirect("/customer");
  }

  redirect("/login?error=unauthorized");
}
