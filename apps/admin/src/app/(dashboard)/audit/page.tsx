import { AdminEmptyState, AdminPage } from "@/components/admin-page";

export default function AuditPage() {
  return (
    <AdminPage
      description={
        <p>
          Trace security-sensitive actions, publishing decisions, and platform
          changes from one append-only record.
        </p>
      }
      eyebrow="System"
      title="Audit log"
    >
      <AdminEmptyState
        description={
          <p>
            Audit event browsing will appear here when the read model is
            connected. Event recording remains active in the underlying
            platform.
          </p>
        }
        title="No audit events to display"
      />
    </AdminPage>
  );
}
