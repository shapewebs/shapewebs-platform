import type { ReactNode } from "react";

import { Authentication } from "@shapewebs/ui";

type AdminAuthShellProps = Readonly<{
  children: ReactNode;
  description: ReactNode;
  eyebrow?: string;
  title: string;
  expanded?: boolean;
  minimal?: boolean;
}>;

export function AdminAuthShell({
  children,
  description,
  eyebrow = "Shapewebs account",
  title,
  expanded = false,
  minimal = false,
}: AdminAuthShellProps) {
  return (
    <Authentication.AuthLayout
      brandHref="/login"
      brandLabel="Shapewebs account sign in"
      description={minimal ? undefined : description}
      eyebrow={minimal ? undefined : eyebrow}
      footer={minimal ? undefined : <p>Private account access</p>}
      size={expanded ? "expanded" : "compact"}
      title={minimal ? undefined : title}
    >
      {children}
    </Authentication.AuthLayout>
  );
}
