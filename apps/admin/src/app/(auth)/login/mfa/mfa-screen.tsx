"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Buttons } from "@shapewebs/ui";
import { createBrowserSupabaseClient } from "@shapewebs/db";
import styles from "./page.module.css";

type TotpFactor = {
  friendlyName?: string;
  id: string;
  status: "verified" | "unverified";
};

type EnrolledFactorState = {
  factorId: string;
  friendlyName?: string;
  qrCode: string;
  secret: string;
  status: "verified" | "unverified";
};

type MfaScreenProps = {
  isConfigured: boolean;
};

function toSvgDataUri(qrCode: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrCode)}`;
}

function getSafeRedirectTarget(redirectTo: string) {
  return redirectTo.startsWith("/") ? redirectTo : "/dashboard";
}

export function MfaScreen({ isConfigured }: MfaScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => {
    return isConfigured ? createBrowserSupabaseClient() : null;
  }, [isConfigured]);
  const [isLoading, setIsLoading] = useState(Boolean(supabase));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrolledFactor, setEnrolledFactor] = useState<EnrolledFactorState | null>(null);
  const [verifiedFactor, setVerifiedFactor] = useState<TotpFactor | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const redirectTo = getSafeRedirectTarget(searchParams.get("redirectTo") ?? "/dashboard");

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    async function loadFactors() {
      const client = supabase;

      if (!client) {
        return;
      }

      const [{ data: assurance }, { data: factorData, error: factorError }] =
        await Promise.all([
          client.auth.mfa.getAuthenticatorAssuranceLevel(),
          client.auth.mfa.listFactors(),
        ]);

      if (cancelled) {
        return;
      }

      if (assurance?.currentLevel === "aal2") {
        router.replace(getSafeRedirectTarget(redirectTo));
        router.refresh();
        return;
      }

      if (factorError) {
        setErrorMessage(factorError.message);
        setIsLoading(false);
        return;
      }

      const factors = [
        ...(factorData?.all ?? []),
      ].filter((factor) => factor.factor_type === "totp");

      const activeFactor = factors.find((factor) => factor.status === "verified");
      const pendingFactor = factors.find((factor) => factor.status === "unverified");

      setVerifiedFactor(
        activeFactor
          ? {
              friendlyName: activeFactor.friendly_name,
              id: activeFactor.id,
              status: activeFactor.status,
            }
          : null,
      );

      if (pendingFactor) {
        setEnrolledFactor((current) =>
          current && current.factorId === pendingFactor.id
            ? current
            : {
                factorId: pendingFactor.id,
                friendlyName: pendingFactor.friendly_name,
                qrCode: "",
                secret: "",
                status: pendingFactor.status,
              },
        );
      }

      setIsLoading(false);
    }

    void loadFactors();

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router, supabase]);

  const activeFactorId = useMemo(() => {
    return verifiedFactor?.id ?? enrolledFactor?.factorId ?? null;
  }, [enrolledFactor, verifiedFactor]);

  return (
    <div className={styles.stackM3q7d5}>
      <section className={styles.cardP8m2v4}>
        <div className={styles.copyBlockN7m3v1}>
          <p className={styles.eyebrowK1m9q4}>Step 2</p>
          <h1 className={styles.titleQ2m8v6}>Multi-factor authentication</h1>
          <p className={styles.copyT6m4p2}>
            Admin access requires a TOTP authenticator before the dashboard
            unlocks.
          </p>
        </div>

        {!isConfigured ? (
          <p className={styles.noticeStateW5m1d9}>
            Supabase auth is not configured in this environment yet, so MFA
            setup cannot be completed here.
          </p>
        ) : null}

        {errorMessage ? (
          <p className={styles.errorStateR7n2q1} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {isLoading ? <p className={styles.mutedH8p2q5}>Checking MFA status...</p> : null}

        {!isLoading && isConfigured ? (
          <>
            {!verifiedFactor && !enrolledFactor ? (
              <Buttons.Button
                disabled={isPending}
                kind="primary"
                onClick={() => {
                  const supabase = createBrowserSupabaseClient();
                  if (!supabase) {
                    setErrorMessage("Supabase auth is not configured.");
                    return;
                  }

                  startTransition(async () => {
                    setErrorMessage(null);

                    const { data, error } = await supabase.auth.mfa.enroll({
                      factorType: "totp",
                      friendlyName: "Shapewebs Admin",
                    });

                    if (error || !data || !("totp" in data)) {
                      setErrorMessage(error?.message ?? "Could not start MFA enrollment.");
                      return;
                    }

                    setEnrolledFactor({
                      factorId: data.id,
                      friendlyName: data.friendly_name,
                      qrCode: data.totp.qr_code,
                      secret: data.totp.secret,
                      status: "unverified",
                    });
                  });
                }}
                size="medium"
                type="button"
              >
                Start TOTP setup
              </Buttons.Button>
            ) : null}

            {enrolledFactor ? (
              <div className={styles.setupGridD3m8p2}>
                <div className={styles.qrPanelN6q5v7}>
                  {enrolledFactor.qrCode ? (
                    <Image
                      alt="TOTP setup QR code"
                      className={styles.qrImageK3p7m2}
                      src={toSvgDataUri(enrolledFactor.qrCode)}
                      unoptimized
                      width={240}
                      height={240}
                    />
                  ) : (
                    <div className={styles.qrPlaceholderV8m2n3}>
                      Existing factor found. Use your authenticator app code to verify.
                    </div>
                  )}
                </div>

                <div className={styles.setupFieldsF4m6p1}>
                  <p className={styles.mutedH8p2q5}>
                    Scan the QR code in your authenticator app, or use the setup
                    secret below if scanning is unavailable.
                  </p>

                  {enrolledFactor.secret ? (
                    <div className={styles.secretBoxJ7m2r8}>{enrolledFactor.secret}</div>
                  ) : null}

                  <label className={styles.fieldT5m3n9}>
                    <span>Authenticator code</span>
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      onChange={(event) => {
                        setSetupCode(event.target.value);
                      }}
                      placeholder="123456"
                      type="text"
                      value={setupCode}
                    />
                  </label>

                  <Buttons.Button
                    disabled={!activeFactorId || setupCode.trim().length < 6 || isPending}
                    kind="primary"
                    onClick={() => {
                      const supabase = createBrowserSupabaseClient();
                      if (!supabase || !activeFactorId) {
                        setErrorMessage("MFA verification is not available.");
                        return;
                      }

                      startTransition(async () => {
                        setErrorMessage(null);

                        const { error } = await supabase.auth.mfa.challengeAndVerify({
                          factorId: activeFactorId,
                          code: setupCode.trim(),
                        });

                        if (error) {
                          setErrorMessage(error.message);
                          return;
                        }

                        router.replace(getSafeRedirectTarget(redirectTo));
                        router.refresh();
                      });
                    }}
                    size="medium"
                    type="button"
                  >
                    {isPending ? "Verifying..." : "Verify and continue"}
                  </Buttons.Button>
                </div>
              </div>
            ) : null}

            {verifiedFactor ? (
              <p className={styles.noticeStateW5m1d9}>
                A verified factor is already enrolled. Enter a fresh authenticator
                code to finish this login.
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
