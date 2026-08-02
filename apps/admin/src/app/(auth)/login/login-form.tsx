"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { adminAuthClient } from "@shapewebs/auth/client";
import { Authentication, Buttons, Forms, Navigation } from "@shapewebs/ui";

import { getSafeAdminRedirectTarget } from "@/lib/redirect";

type LoginFormProps = {
  isConfigured: boolean;
};

type LoginStage = "email" | "methods";

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
  return method === "email" ? method : "methods";
}

export function LoginForm({ isConfigured }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pendingMethod, setPendingMethod] = useState<
    "google" | "passkey" | "password" | null
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

  function signInWithPasskey() {
    if (!isConfigured) {
      setErrorMessage("Authentication is not configured in this environment.");
      return;
    }

    if (
      typeof window.PublicKeyCredential === "undefined" ||
      typeof navigator.credentials === "undefined"
    ) {
      setErrorMessage("Passkeys are not supported by this browser or device.");
      return;
    }

    setPendingMethod("passkey");
    startTransition(async () => {
      setErrorMessage(null);

      try {
        const { data, error } = await adminAuthClient.signIn.passkey({
          autoFill: false,
        });

        if (error || !data) {
          const errorCode =
            error && "code" in error && typeof error.code === "string"
              ? error.code
              : null;
          setPendingMethod(null);
          setErrorMessage(
            errorCode === "AUTH_CANCELLED" ||
              errorCode === "ERROR_CEREMONY_ABORTED"
              ? "Passkey sign-in was cancelled."
              : "Passkey sign-in could not be completed. Please try again.",
          );
          return;
        }

        window.location.assign(completionPath);
      } catch {
        setPendingMethod(null);
        setErrorMessage(
          "Passkey sign-in is temporarily unavailable. Please try again.",
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
    return null;
  }

  return (
    <>
      <Authentication.AuthStageTransition stage={stage}>
        {(displayedStage) => {
          if (displayedStage === "email") {
            return (
              <>
                <Authentication.AuthStageHeader title="What’s your email address?" />
                <Authentication.AuthStack>
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
                        placeholder="Enter email address..."
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
                      placeholder="Enter password..."
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
                        Continue
                      </Buttons.Button>
                    </Authentication.AuthActions>
                    {renderMessage()}
                  </Forms.Form>
                  <Authentication.AuthLinks layout="stacked">
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

          return (
            <>
              <Authentication.AuthStageHeader title="Log in to Shapewebs" />
              <Authentication.AuthStack>
                <Authentication.AuthActions>
                  <Buttons.Button
                    disabled={!isConfigured || pendingMethod !== null}
                    kind="brand"
                    onClick={signInWithGoogle}
                    pending={isPending && pendingMethod === "google"}
                    pendingLabel="Opening Google"
                    size="large"
                    type="button"
                  >
                    Continue with Google
                  </Buttons.Button>
                  <Buttons.Button
                    disabled={pendingMethod !== null}
                    kind="secondary"
                    onClick={() => showStage("email")}
                    size="large"
                    type="button"
                  >
                    Continue with email
                  </Buttons.Button>
                  <Buttons.Button
                    disabled={!isConfigured || pendingMethod !== null}
                    kind="secondary"
                    onClick={signInWithPasskey}
                    pending={pendingMethod === "passkey"}
                    pendingLabel="Waiting for passkey..."
                    size="large"
                    type="button"
                  >
                    {pendingMethod === "passkey"
                      ? "Waiting for passkey..."
                      : "Continue with passkey"}
                  </Buttons.Button>
                </Authentication.AuthActions>
                {renderMessage()}
                <Authentication.AuthLinks>
                  Don’t have an account?{" "}
                  <Navigation.Link href="/forgot-password">
                    Recover user
                  </Navigation.Link>{" "}
                  or{" "}
                  <Navigation.Link href="mailto:support@shapewebs.com?subject=Shapewebs%20account%20access">
                    learn more
                  </Navigation.Link>
                </Authentication.AuthLinks>
              </Authentication.AuthStack>
            </>
          );
        }}
      </Authentication.AuthStageTransition>
    </>
  );
}
