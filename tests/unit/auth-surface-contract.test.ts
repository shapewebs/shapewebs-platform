import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function read(pathname: string): string {
  // The caller only supplies repository-owned paths declared in this test.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(resolve(repositoryRoot, pathname), "utf8");
}

const adminSignedOutPages = [
  "apps/admin/src/app/(auth)/activate/page.tsx",
  "apps/admin/src/app/(auth)/forgot-password/page.tsx",
  "apps/admin/src/app/(auth)/invite/[token]/page.tsx",
  "apps/admin/src/app/(auth)/login/page.tsx",
  "apps/admin/src/app/(auth)/login/mfa/page.tsx",
  "apps/admin/src/app/(auth)/register/check-email/page.tsx",
  "apps/admin/src/app/(auth)/register/page.tsx",
  "apps/admin/src/app/(auth)/reset-password/page.tsx",
  "apps/admin/src/app/(auth)/verify/[token]/page.tsx",
];

describe("signed-out authentication surface contract", () => {
  it("keeps every signed-out page titled and inside the shared auth shell", () => {
    for (const pathname of adminSignedOutPages) {
      const source = read(pathname);

      expect(source, pathname).toContain("metadata");
      expect(source, pathname).toContain("AdminAuthShell");
    }
  });

  it("keeps staff enrollment private and customer registration invitation-bound", () => {
    expect(
      existsSync(resolve(repositoryRoot, "apps/admin/src/app/(auth)/signup")),
    ).toBe(false);
    expect(
      read("apps/admin/src/app/(auth)/activate/activation-form.tsx"),
    ).toContain("/api/admin/account/activate");
    expect(read("apps/admin/src/app/(auth)/register/page.tsx")).toContain(
      "getAccountRegistrationContext",
    );
    expect(read("apps/admin/src/app/(auth)/register/page.tsx")).toContain(
      'redirect("/login?error=invitation")',
    );
  });

  it("preserves CSRF tokens and native secure invitation boundaries", () => {
    const guardedAccountPages = [
      "apps/admin/src/app/(auth)/invite/[token]/page.tsx",
      "apps/admin/src/app/(auth)/register/page.tsx",
      "apps/admin/src/app/(auth)/verify/[token]/page.tsx",
    ];

    for (const pathname of guardedAccountPages) {
      const source = read(pathname);

      expect(source, pathname).toContain('name="csrfToken"');
      expect(source, pathname).toContain('method="post"');
      expect(source, pathname).toContain("createAccountFormToken");
      expect(source, pathname).toContain("AccountTurnstileField");
    }
  });

  it("does not activate WebAuthn behind the passkey presentation", () => {
    const passkeySource = read(
      "packages/ui/src/system/authentication/passkey-frame.tsx",
    );
    const adminLoginSource = read(
      "apps/admin/src/app/(auth)/login/login-form.tsx",
    );

    expect(passkeySource).not.toMatch(
      /navigator\.credentials|PublicKeyCredential/,
    );
    expect(passkeySource).not.toMatch(/onClick|fetch\(|<button|<form/);
    expect(adminLoginSource).toContain(
      '<Authentication.PasskeyFrame status="unavailable" />',
    );
  });

  it("uses one staged method picker without exposing credentials initially", () => {
    const adminLoginSource = read(
      "apps/admin/src/app/(auth)/login/login-form.tsx",
    );
    const transitionSource = read(
      "packages/ui/src/system/authentication/auth-stage-transition.tsx",
    );

    expect(adminLoginSource).toContain("Continue with Google");
    expect(adminLoginSource).toContain("Continue with email");
    expect(adminLoginSource).toContain("Continue with passkey");
    expect(adminLoginSource).toContain('displayedStage === "email"');
    expect(adminLoginSource).toContain('displayedStage === "passkey"');
    expect(adminLoginSource).toContain("Back to login");
    expect(adminLoginSource).toContain("Forgot your password?");

    expect(transitionSource).toContain("data-transition-phase={phase}");
    expect(transitionSource).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)")',
    );
  });

  it("uses generic route failures without rendering exception details", () => {
    const adminBoundary = read("apps/admin/src/app/(auth)/error.tsx");

    expect(adminBoundary).toContain("unstable_retry");
    expect(adminBoundary).not.toContain("error.message");
    expect(adminBoundary).not.toContain("dangerouslySetInnerHTML");
  });

  it("handles rejected account authentication requests inside event actions", () => {
    const clientActions = [
      "apps/admin/src/app/(auth)/activate/activation-form.tsx",
      "apps/admin/src/app/(auth)/forgot-password/forgot-password-form.tsx",
      "apps/admin/src/app/(auth)/login/login-form.tsx",
      "apps/admin/src/app/(auth)/login/mfa/mfa-screen.tsx",
      "apps/admin/src/app/(auth)/reset-password/reset-password-form.tsx",
    ];

    for (const pathname of clientActions) {
      const source = read(pathname);

      expect(source, pathname).toContain("catch {");
      expect(source, pathname).not.toContain("error.message");
      expect(source, pathname).not.toContain("String(error)");
    }
  });
});
