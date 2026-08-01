"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

import { getSafeAdminRedirectTarget } from "@/lib/redirect";

type LoginFormProps = {
  isConfigured: boolean;
  isLocalSetupMode: boolean;
};

type LoginStage = "email" | "methods" | "passkey";

function getRouteErrorMessage(errorCode: string | null) {
  switch (errorCode) {
    case "access_denied":
    case "unauthorized":
      return "This account does not have active Shapewebs access.";
    case "setup":
      return "Authentication still needs to be configured for this environment.";
    default:
      return null;
  }
}

function getInitialStage(method: string | null): LoginStage {
  return method === "email" || method === "passkey" ? method : "methods";
}

export function LoginForm({ isConfigured, isLocalSetupMode }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingMethod, setPendingMethod] = useState<
    "google" | "password" | null
  >(null);
  const [stage, setStage] = useState<LoginStage>(() =>
    getInitialStage(searchParams.get("method")),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTo = getSafeAdminRedirectTarget(
    searchParams.get("redirectTo") ?? "/dashboard",
  );
  const routeErrorMessage = getRouteErrorMessage(searchParams.get("error"));
  const statusMessage = searchParams.has("verified")
    ? "Your email is verified. Sign in with your password."
    : searchParams.has("passwordUpdated")
      ? "Your password is ready. You can now use Google or password."
      : null;
  const mfaPath = `/login/mfa?redirectTo=${encodeURIComponent(redirectTo)}`;
  const completionPath = `/login/complete?redirectTo=${encodeURIComponent(redirectTo)}`;

  function getLoginHref(nextStage?: Exclude<LoginStage, "methods">) {
    const query = new URLSearchParams();

    if (nextStage) {
      query.set("method", nextStage);
    }
    if (redirectTo !== "/dashboard") {
      query.set("redirectTo", redirectTo);
    }

    const serialized = query.toString();
    return serialized ? `/login?${serialized}` : "/login";
  }

  function showStage(nextStage: LoginStage) {
    setErrorMessage(null);
    setStage(nextStage);
  }

  function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isConfigured) {
      setErrorMessage("Authentication is not configured in this environment.");
      return;
    }

    setPendingMethod("password");
    startTransition(async () => {
      setErrorMessage(null);

      try {
        const { data, error } = await adminAuthClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          rememberMe: false,
        });

        if (error || !data) {
          setPendingMethod(null);
          setErrorMessage(
            "Sign-in could not be completed. Check your details and try again.",
          );
          return;
        }

        const pendingChallenge =
          "twoFactorRedirect" in data && data.twoFactorRedirect === true;
        window.location.assign(
          pendingChallenge ? `${mfaPath}&pending=password` : completionPath,
        );
      } catch {
        setPendingMethod(null);
        setErrorMessage(
          "Sign-in is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  function signInWithGoogle() {
    if (!isConfigured) {
      setErrorMessage("Authentication is not configured in this environment.");
      return;
    }

    setPendingMethod("google");
    startTransition(async () => {
      setErrorMessage(null);

      try {
        const { error } = await adminAuthClient.signIn.social({
          callbackURL: completionPath,
          errorCallbackURL: `/login?error=access_denied&redirectTo=${encodeURIComponent(redirectTo)}`,
          provider: "google",
        });

        if (error) {
          setPendingMethod(null);
          setErrorMessage(
            "Google sign-in could not be started. Please try again.",
          );
        }
      } catch {
        setPendingMethod(null);
        setErrorMessage(
          "Google sign-in is temporarily unavailable. Please try again.",
        );
      }
    });
  }

  function renderMessage() {
    if (statusMessage) {
      return (
        <Authentication.AuthMessage tone="success">
          {statusMessage}
        </Authentication.AuthMessage>
      );
    }
    if (errorMessage) {
      return (
        <Authentication.AuthMessage tone="error">
          {errorMessage}
        </Authentication.AuthMessage>
      );
    }
    if (routeErrorMessage) {
      return (
        <Authentication.AuthMessage tone="error">
          {routeErrorMessage}
        </Authentication.AuthMessage>
      );
    }
    if (isLocalSetupMode) {
      return (
        <Authentication.AuthMessage>
          Local setup mode is active for interface work.
        </Authentication.AuthMessage>
      );
    }
    if (!isConfigured) {
      return (
        <Authentication.AuthMessage tone="error">
          Authentication is unavailable in this environment.
        </Authentication.AuthMessage>
      );
    }

    return null;
  }

  return (
    <Authentication.AuthStageTransition stage={stage}>
      {(displayedStage) => {
        if (displayedStage === "email") {
          return (
            <>
              <Authentication.AuthStageHeader title="Sign in with email" />
              <Authentication.AuthStack>
                {renderMessage()}
                <Forms.Form onSubmit={signInWithPassword}>
                  <Forms.Field>
                    <Forms.Label htmlFor="employee-email">Email</Forms.Label>
                    <Forms.Input
                      autoComplete="email"
                      autoFocus
                      controlSize="large"
                      disabled={isPending}
                      id="employee-email"
                      maxLength={320}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      type="email"
                      value={email}
                    />
                  </Forms.Field>
                  <Forms.PasswordField
                    autoComplete="current-password"
                    disabled={isPending}
                    label="Password"
                    maxLength={128}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    value={password}
                  />
                  <Authentication.AuthActions>
                    <Buttons.Button
                      disabled={!isConfigured}
                      kind="secondary"
                      pending={isPending && pendingMethod === "password"}
                      pendingLabel="Signing in"
                      size="large"
                      type="submit"
                    >
                      Log in
                    </Buttons.Button>
                  </Authentication.AuthActions>
                </Forms.Form>
                <Authentication.AuthLinks>
                  <Navigation.Link href="/forgot-password">
                    Forgot your password?
                  </Navigation.Link>
                  <Navigation.Link
                    href={getLoginHref()}
                    onClick={(event) => {
                      event.preventDefault();
                      showStage("methods");
                    }}
                  >
                    Back to login
                  </Navigation.Link>
                </Authentication.AuthLinks>
              </Authentication.AuthStack>
            </>
          );
        }

        if (displayedStage === "passkey") {
          return (
            <>
              <Authentication.AuthStageHeader title="Continue with passkey" />
              <Authentication.AuthStack>
                <Authentication.PasskeyFrame status="unavailable" />
                <Authentication.AuthLinks>
                  <Navigation.Link
                    href={getLoginHref()}
                    onClick={(event) => {
                      event.preventDefault();
                      showStage("methods");
                    }}
                  >
                    Back to login
                  </Navigation.Link>
                </Authentication.AuthLinks>
              </Authentication.AuthStack>
            </>
          );
        }

        return (
          <>
            <Authentication.AuthStageHeader title="Sign in" />
            <Authentication.AuthStack>
              {renderMessage()}
              <Authentication.AuthActions>
                <Buttons.Button
                  disabled={!isConfigured}
                  kind="brand"
                  onClick={signInWithGoogle}
                  pending={isPending && pendingMethod === "google"}
                  pendingLabel="Opening Google"
                  size="large"
                  type="button"
                >
                  Continue with Google
                </Buttons.Button>
                <Buttons.ButtonLink
                  href={getLoginHref("email")}
                  kind="secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    showStage("email");
                  }}
                  size="large"
                >
                  Continue with email
                </Buttons.ButtonLink>
                <Buttons.ButtonLink
                  href={getLoginHref("passkey")}
                  kind="secondary"
                  onClick={(event) => {
                    event.preventDefault();
                    showStage("passkey");
                  }}
                  size="large"
                >
                  Continue with passkey
                </Buttons.ButtonLink>
              </Authentication.AuthActions>
            </Authentication.AuthStack>
          </>
        );
      }}
    </Authentication.AuthStageTransition>
  );
}
