"use client";

import Script from "next/script";
import Link from "next/link";
import {
  type Dispatch,
  type FormEvent,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { Buttons } from "@shapewebs/ui";
import styles from "./inquiry-forms.module.css";

type FormState = {
  message: string;
  status: "idle" | "error" | "pending" | "success";
};

const initialState: FormState = {
  message: "",
  status: "idle",
};

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
  reset(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileFieldProps = {
  ready: boolean;
  siteKey: string;
  tokenSetter: Dispatch<SetStateAction<string | null>>;
  widgetIdRef: MutableRefObject<string | null>;
};

function TurnstileField({
  ready,
  siteKey,
  tokenSetter,
  widgetIdRef,
}: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;

    if (!ready || !siteKey || !container || !turnstile) {
      return;
    }

    widgetIdRef.current = turnstile.render(container, {
      action: "lead_submission",
      callback: tokenSetter,
      "error-callback": () => tokenSetter(null),
      "expired-callback": () => tokenSetter(null),
      sitekey: siteKey,
      theme: "auto",
    });

    return () => {
      if (widgetIdRef.current) {
        turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, tokenSetter, widgetIdRef]);

  if (!siteKey) {
    return null;
  }

  return (
    <div className={styles["sw-form-turnstile-k4m8q2"]} ref={containerRef} />
  );
}

function resetTurnstile(
  tokenSetter: Dispatch<SetStateAction<string | null>>,
  widgetIdRef: MutableRefObject<string | null>,
) {
  tokenSetter(null);

  if (widgetIdRef.current && window.turnstile) {
    window.turnstile.reset(widgetIdRef.current);
  }
}

async function submitForm(
  endpoint: string,
  payload: Record<string, unknown>,
  commandId: string,
  turnstileToken: string | null,
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": commandId,
      ...(turnstileToken
        ? {
            "X-Turnstile-Token": turnstileToken,
          }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "The request could not be completed.");
  }

  return data.message ?? "Thanks, your message has been received.";
}

export function InquiryForms() {
  const turnstileSiteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [contactState, setContactState] = useState<FormState>(initialState);
  const [projectState, setProjectState] = useState<FormState>(initialState);
  const [contactToken, setContactToken] = useState<string | null>(null);
  const [projectToken, setProjectToken] = useState<string | null>(null);
  const contactCommandIdRef = useRef<string | null>(null);
  const projectCommandIdRef = useRef<string | null>(null);
  const contactWidgetIdRef = useRef<string | null>(null);
  const projectWidgetIdRef = useRef<string | null>(null);

  function handleSubmit(input: {
    commandIdRef: MutableRefObject<string | null>;
    endpoint: string;
    event: FormEvent<HTMLFormElement>;
    payload: Record<string, unknown>;
    setState: Dispatch<SetStateAction<FormState>>;
    token: string | null;
    tokenSetter: Dispatch<SetStateAction<string | null>>;
    widgetIdRef: MutableRefObject<string | null>;
  }) {
    input.event.preventDefault();

    if (turnstileSiteKey && !input.token) {
      input.setState({
        message: "Please complete the security check before submitting.",
        status: "error",
      });
      return;
    }

    const form = input.event.currentTarget;
    const commandId =
      input.commandIdRef.current ?? globalThis.crypto.randomUUID();
    input.commandIdRef.current = commandId;
    input.setState({
      message: "Sending your request…",
      status: "pending",
    });

    void submitForm(input.endpoint, input.payload, commandId, input.token)
      .then((message) => {
        input.setState({
          message,
          status: "success",
        });
        form.reset();
        input.commandIdRef.current = null;
        resetTurnstile(input.tokenSetter, input.widgetIdRef);
      })
      .catch((error: Error) => {
        input.setState({
          message: error.message,
          status: "error",
        });
        resetTurnstile(input.tokenSetter, input.widgetIdRef);
      });
  }

  return (
    <>
      {turnstileSiteKey ? (
        <Script
          onError={() => setTurnstileReady(false)}
          onReady={() => setTurnstileReady(true)}
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="lazyOnload"
        />
      ) : null}

      <div className={styles.gridW6m2q3}>
        <section className={styles.panelP4m8v2}>
          <header className={styles.panelHeaderT5m1q4}>
            <p className={styles.eyebrowR2m7q8}>Contact</p>
            <h2>General inquiries</h2>
          </header>

          <form
            className={styles.formF9m3q2}
            onSubmit={(event) => {
              const formData = new FormData(event.currentTarget);

              handleSubmit({
                commandIdRef: contactCommandIdRef,
                endpoint: "/api/forms/contact",
                event,
                payload: {
                  name: formData.get("name"),
                  email: formData.get("email"),
                  company: formData.get("company"),
                  message: formData.get("message"),
                  localeCode: "en",
                  consentAccepted: formData.get("consentAccepted") === "on",
                },
                setState: setContactState,
                token: contactToken,
                tokenSetter: setContactToken,
                widgetIdRef: contactWidgetIdRef,
              });
            }}
          >
            <label className={styles.fieldQ8m1p6}>
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Email</span>
              <input name="email" required type="email" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Company</span>
              <input name="company" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Message</span>
              <textarea name="message" required rows={6} />
            </label>
            <label className={styles["sw-form-consent-n7c2v5"]}>
              <input name="consentAccepted" required type="checkbox" />
              <span>
                I have read the{" "}
                <Link href="/legal/privacy">privacy policy</Link> and understand
                how Shapewebs will use my details to respond.
              </span>
            </label>

            <TurnstileField
              ready={turnstileReady}
              siteKey={turnstileSiteKey}
              tokenSetter={setContactToken}
              widgetIdRef={contactWidgetIdRef}
            />

            {contactState.status !== "idle" ? (
              <p
                aria-live="polite"
                className={
                  contactState.status === "success"
                    ? styles.successStateM3q7p4
                    : styles.errorStateV8m2q1
                }
              >
                {contactState.message}
              </p>
            ) : null}

            <Buttons.Button
              disabled={contactState.status === "pending"}
              kind="primary"
              size="medium"
              type="submit"
            >
              {contactState.status === "pending"
                ? "Sending…"
                : "Send contact request"}
            </Buttons.Button>
          </form>
        </section>

        <section className={styles.panelP4m8v2}>
          <header className={styles.panelHeaderT5m1q4}>
            <p className={styles.eyebrowR2m7q8}>Project inquiry</p>
            <h2>Website project brief</h2>
          </header>

          <form
            className={styles.formF9m3q2}
            onSubmit={(event) => {
              const formData = new FormData(event.currentTarget);

              handleSubmit({
                commandIdRef: projectCommandIdRef,
                endpoint: "/api/forms/project-inquiry",
                event,
                payload: {
                  name: formData.get("name"),
                  email: formData.get("email"),
                  company: formData.get("company"),
                  message: formData.get("message"),
                  budgetBand: formData.get("budgetBand"),
                  timeline: formData.get("timeline"),
                  serviceInterest: formData.get("serviceInterest"),
                  localeCode: "en",
                  consentAccepted: formData.get("consentAccepted") === "on",
                },
                setState: setProjectState,
                token: projectToken,
                tokenSetter: setProjectToken,
                widgetIdRef: projectWidgetIdRef,
              });
            }}
          >
            <label className={styles.fieldQ8m1p6}>
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Email</span>
              <input name="email" required type="email" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Company</span>
              <input name="company" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Budget</span>
              <input name="budgetBand" placeholder="€5k-10k" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Timeline</span>
              <input name="timeline" placeholder="6-8 weeks" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Service interest</span>
              <input name="serviceInterest" placeholder="Website strategy" />
            </label>
            <label className={styles.fieldQ8m1p6}>
              <span>Project brief</span>
              <textarea name="message" required rows={6} />
            </label>
            <label className={styles["sw-form-consent-n7c2v5"]}>
              <input name="consentAccepted" required type="checkbox" />
              <span>
                I have read the{" "}
                <Link href="/legal/privacy">privacy policy</Link> and understand
                how Shapewebs will use my details to respond.
              </span>
            </label>

            <TurnstileField
              ready={turnstileReady}
              siteKey={turnstileSiteKey}
              tokenSetter={setProjectToken}
              widgetIdRef={projectWidgetIdRef}
            />

            {projectState.status !== "idle" ? (
              <p
                aria-live="polite"
                className={
                  projectState.status === "success"
                    ? styles.successStateM3q7p4
                    : styles.errorStateV8m2q1
                }
              >
                {projectState.message}
              </p>
            ) : null}

            <Buttons.Button
              disabled={projectState.status === "pending"}
              kind="primary"
              size="medium"
              type="submit"
            >
              {projectState.status === "pending"
                ? "Sending…"
                : "Send project inquiry"}
            </Buttons.Button>
          </form>
        </section>
      </div>
    </>
  );
}
