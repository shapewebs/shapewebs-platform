"use client";

import { useState } from "react";
import { Buttons } from "@shapewebs/ui";
import styles from "./inquiry-forms.module.css";

type FormState = {
  message: string;
  status: "idle" | "error" | "success";
};

const initialState: FormState = {
  message: "",
  status: "idle",
};

async function submitForm(endpoint: string, payload: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    error?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "The request could not be completed.");
  }

  return data.message ?? "Thanks, your message has been received.";
}

export function InquiryForms() {
  const [contactState, setContactState] = useState<FormState>(initialState);
  const [projectState, setProjectState] = useState<FormState>(initialState);

  return (
    <div className={styles.gridW6m2q3}>
      <section className={styles.panelP4m8v2}>
        <header className={styles.panelHeaderT5m1q4}>
          <p className={styles.eyebrowR2m7q8}>Contact</p>
          <h2>General inquiries</h2>
        </header>

        <form
          className={styles.formF9m3q2}
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void submitForm("/api/forms/contact", {
              name: formData.get("name"),
              email: formData.get("email"),
              company: formData.get("company"),
              message: formData.get("message"),
              localeCode: "en",
              consentAccepted: true,
            })
              .then((message) => {
                setContactState({
                  message,
                  status: "success",
                });
                event.currentTarget.reset();
              })
              .catch((error: Error) => {
                setContactState({
                  message: error.message,
                  status: "error",
                });
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

          {contactState.status !== "idle" ? (
            <p
              className={
                contactState.status === "success"
                  ? styles.successStateM3q7p4
                  : styles.errorStateV8m2q1
              }
            >
              {contactState.message}
            </p>
          ) : null}

          <Buttons.Button kind="primary" size="medium" type="submit">
            Send contact request
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
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            void submitForm("/api/forms/project-inquiry", {
              name: formData.get("name"),
              email: formData.get("email"),
              company: formData.get("company"),
              message: formData.get("message"),
              budgetBand: formData.get("budgetBand"),
              timeline: formData.get("timeline"),
              serviceInterest: formData.get("serviceInterest"),
              localeCode: "en",
              consentAccepted: true,
            })
              .then((message) => {
                setProjectState({
                  message,
                  status: "success",
                });
                event.currentTarget.reset();
              })
              .catch((error: Error) => {
                setProjectState({
                  message: error.message,
                  status: "error",
                });
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

          {projectState.status !== "idle" ? (
            <p
              className={
                projectState.status === "success"
                  ? styles.successStateM3q7p4
                  : styles.errorStateV8m2q1
              }
            >
              {projectState.message}
            </p>
          ) : null}

          <Buttons.Button kind="primary" size="medium" type="submit">
            Send project inquiry
          </Buttons.Button>
        </form>
      </section>
    </div>
  );
}
