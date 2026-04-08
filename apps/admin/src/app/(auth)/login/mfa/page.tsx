import { Suspense } from "react";
import { hasAdminSupabaseConfig } from "@/lib/supabase";
import { MfaScreen } from "./mfa-screen";

export default function MfaPage() {
  return (
    <Suspense fallback={null}>
      <MfaScreen isConfigured={hasAdminSupabaseConfig()} />
    </Suspense>
  );
}
