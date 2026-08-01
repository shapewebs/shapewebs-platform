import { connection } from "next/server";
import type { Metadata } from "next";
import { Authentication, Navigation } from "@shapewebs/ui";

import { AdminAuthShell } from "@/components/admin-auth-shell";

export const metadata: Metadata = {
  title: "Check your email",
};

export default async function CheckAccountEmailPage() {
  await connection();

  return (
    <AdminAuthShell
      description={
        <p>
          Open the single-use Shapewebs message to verify your mailbox and
          activate your assigned projects.
        </p>
      }
      eyebrow="Email verification"
      title="Check your inbox"
    >
      <Authentication.AuthStack>
        <Authentication.AuthMessage>
          Your provisional account is safely stored, but it has no customer
          access until verification is complete.
        </Authentication.AuthMessage>
        <Authentication.AuthLinks>
          <Navigation.Link href="/login">Return to sign in</Navigation.Link>
        </Authentication.AuthLinks>
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}
