"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AccountTurnstileAction } from "@/lib/account-turnstile-contract";

import styles from "./account-turnstile-field.module.css";

type TurnstileApi = {
  remove(widgetId: string): void;
  render(
    container: HTMLElement,
    options: {
      action: string;
      callback(token: string): void;
      "error-callback"(): void;
      "expired-callback"(): void;
      sitekey: string;
      theme: "auto";
    },
  ): string;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function AccountTurnstileField({
  action,
  nonce,
  onTokenChange,
  showStatus = true,
  siteKey,
}: {
  action: AccountTurnstileAction;
  nonce: string;
  onTokenChange?: (token: string) => void;
  showStatus?: boolean;
  siteKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const updateToken = useCallback(
    (nextToken: string) => {
      setToken(nextToken);
      onTokenChange?.(nextToken);
    },
    [onTokenChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;

    if (!ready || !container || !turnstile || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = turnstile.render(container, {
      action,
      callback: updateToken,
      "error-callback": () => updateToken(""),
      "expired-callback": () => updateToken(""),
      sitekey: siteKey,
      theme: "auto",
    });

    return () => {
      if (widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, ready, siteKey, updateToken]);

  return (
    <div className={styles["accountturnstile-root-h7m2qk"]}>
      <Script
        nonce={nonce}
        onError={() => setReady(false)}
        onReady={() => setReady(true)}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
      />
      <div ref={containerRef} />
      <input name="turnstileToken" type="hidden" value={token} />
      {showStatus ? (
        <p
          aria-live="polite"
          className={styles["accountturnstile-status-v4n9pc"]}
        >
          {token ? "Security check complete." : "Complete the security check."}
        </p>
      ) : null}
    </div>
  );
}
