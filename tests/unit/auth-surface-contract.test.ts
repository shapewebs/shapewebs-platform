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

  it("activates passkeys through the shared Better Auth client and strict server policy", () => {
    const authClientSource = read("packages/auth/src/client.ts");
    const authServerSource = read("packages/auth/src/create-auth.ts");
    const passkeyPolicySource = read("packages/auth/src/passkey-policy.ts");
    const adminLoginSource = read(
      "apps/admin/src/app/(auth)/login/login-form.tsx",
    );
    const accountSecuritySource = read(
      "apps/admin/src/components/account-security-methods.tsx",
    );
    const databaseSource = read("packages/database/src/admin-auth.ts");
    const migrationSource = read(
      "drizzle/0020_secure-passkey-authentication.sql",
    );

    expect(authClientSource).toContain("passkeyClient()");
    expect(authServerSource).toContain("passkey({");
    expect(authServerSource).toContain('residentKey: "required"');
    expect(authServerSource).toContain('userVerification: "required"');
    expect(authServerSource).toContain("requirePasskeyUserVerification");
    expect(authServerSource).toContain("isPasskeyVerifiedSessionCreation");
    expect(authServerSource).toContain("stepUpVerifiedAt: passkeyVerifiedAt");
    expect(authServerSource).toContain('"/passkey/delete-passkey"');
    expect(authServerSource).toContain('"/passkey/generate-register-options"');
    expect(authServerSource).toContain('"/passkey/verify-registration"');
    expect(authServerSource).toContain("hasFreshAdminSessionStepUp");
    expect(authServerSource).toContain("requireRemovablePasskey");
    expect(passkeyPolicySource).toContain("origin.hostname");
    expect(passkeyPolicySource).toContain("origin.origin");
    expect(adminLoginSource).toContain("adminAuthClient.signIn.passkey({");
    expect(adminLoginSource).toContain('pendingLabel="Waiting for passkey..."');
    expect(accountSecuritySource).toContain(
      "adminAuthClient.passkey.addPasskey()",
    );
    expect(accountSecuritySource).toContain(
      "adminAuthClient.passkey.deletePasskey({",
    );
    expect(databaseSource).toContain("passkeys: passkeys.map");
    expect(migrationSource).toContain(
      'CREATE UNIQUE INDEX "passkey_credentialID_unique"',
    );
    expect(migrationSource).toContain("REVOKE ALL PRIVILEGES ON auth.passkey");
    expect(migrationSource).toContain("TO shapewebs_admin_runtime");

    const completionSource = read(
      "apps/admin/src/app/(auth)/login/complete/page.tsx",
    );
    expect(completionSource).toContain("runtime.authorization.latestStepUpAt");
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
    expect(adminLoginSource).not.toContain('displayedStage === "passkey"');
    expect(adminLoginSource).toContain("Back to login");
    expect(adminLoginSource).toContain("Forgot your password?");
    expect(adminLoginSource).toContain('placeholder="Enter email address..."');
    expect(adminLoginSource).toContain('placeholder="Enter password..."');
    expect(adminLoginSource).toContain(
      '<Authentication.AuthLinks layout="stacked">',
    );
    expect(adminLoginSource).toContain("Don’t have an account?");
    expect(adminLoginSource).toContain("Recover user");
    expect(adminLoginSource).toContain("learn more");
    expect(
      adminLoginSource.indexOf(
        "{renderMessage()}",
        adminLoginSource.indexOf("Continue with passkey"),
      ),
    ).toBeGreaterThan(adminLoginSource.indexOf("Continue with passkey"));

    expect(transitionSource).toContain("data-transition-phase={phase}");
    expect(transitionSource).toContain(
      'window.matchMedia("(prefers-reduced-motion: reduce)")',
    );
  });

  it("anchors every auth stage and only animates the shared shell on entry", () => {
    const layoutStyles = read(
      "packages/ui/src/system/authentication/auth-layout.module.css",
    );
    const layoutSource = read(
      "packages/ui/src/system/authentication/auth-layout.tsx",
    );
    const loginPageSource = read("apps/admin/src/app/(auth)/login/page.tsx");
    const loginFormSource = read(
      "apps/admin/src/app/(auth)/login/login-form.tsx",
    );

    expect(layoutStyles).toContain("--auth-layout-anchor-y:");
    expect(layoutStyles).toContain(
      "background: rgb(var(--color-bg-secondary) / 1);",
    );
    expect(layoutStyles).toContain("place-items: start center;");
    expect(layoutStyles).toContain("margin-top: var(--space-3);");
    expect(layoutStyles).toContain('[data-layout="stacked"]');
    expect(layoutStyles).toContain('> a[data-component-status="styled"]');
    expect(layoutStyles).toContain("min-height: 0;");
    expect(layoutStyles).toContain(
      "animation: sw-authlayout-enter-5s2k8m 280ms var(--ease-out-quad) backwards;",
    );
    expect(layoutStyles).toContain("transform: translateY(-5px);");
    expect(layoutSource).toContain("overlay?: ReactNode;");
    expect(layoutSource.indexOf("{overlay}")).toBeLessThan(
      layoutSource.indexOf("className={mergeClassNames("),
    );
    expect(loginPageSource).toContain("Feedback.NotificationViewport");
    expect(loginPageSource).toContain("Feedback.Notification");
    expect(loginPageSource).toContain('delay="initial"');
    expect(loginPageSource).toContain(
      "Authentication is unavailable in this environment.",
    );
    expect(loginFormSource).not.toContain("Feedback.NotificationViewport");
    expect(
      existsSync(
        resolve(repositoryRoot, "apps/admin/src/app/(auth)/loading.tsx"),
      ),
    ).toBe(false);
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

  it("keeps password recovery visually minimal", () => {
    const pageSource = read(
      "apps/admin/src/app/(auth)/forgot-password/page.tsx",
    );
    const formSource = read(
      "apps/admin/src/app/(auth)/forgot-password/forgot-password-form.tsx",
    );

    expect(pageSource).toContain("minimal");
    expect(pageSource).not.toContain("This works both for password recovery");
    expect(formSource).toContain(
      '<Authentication.AuthStageHeader title="Set or recover a password" />',
    );
    expect(formSource).toContain("showStatus={false}");
    expect(formSource).toContain("onTokenChange={setTurnstileToken}");
    expect(formSource).toContain("disabled={!isConfigured || !turnstileToken}");
    expect(formSource).toContain(
      "setTurnstileAttempt((attempt) => attempt + 1)",
    );
    expect(formSource).toContain('placeholder="Enter email address..."');
  });
});
