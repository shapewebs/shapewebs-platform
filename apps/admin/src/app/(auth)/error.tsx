"use client";

import { Authentication, Buttons } from "@shapewebs/ui";

import { AdminAuthShell } from "@/components/admin-auth-shell";

export default function AdminAuthError({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <AdminAuthShell
      description={
        <p>
          No sign-in or account change was completed. You can safely try this
          step again.
        </p>
      }
      eyebrow="Secure access"
      title="This page could not be loaded"
    >
      <Authentication.AuthStack>
        <Authentication.AuthMessage tone="error">
          Shapewebs could not finish loading this authentication step.
        </Authentication.AuthMessage>
        <Authentication.AuthActions>
          <Buttons.Button kind="brand" onClick={unstable_retry} size="large">
            Try again
          </Buttons.Button>
        </Authentication.AuthActions>
      </Authentication.AuthStack>
    </AdminAuthShell>
  );
}
