import { Authentication } from "@shapewebs/ui";

import { AdminAuthShell } from "@/components/admin-auth-shell";

export default function AdminAuthLoading() {
  return (
    <AdminAuthShell
      description={<p>Preparing the secure employee authentication flow.</p>}
      eyebrow="Secure access"
      title="Loading"
    >
      <Authentication.AuthPending label="Loading secure access" />
    </AdminAuthShell>
  );
}
