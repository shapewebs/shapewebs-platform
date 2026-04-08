import type { Metadata } from "next";
import { InquiryForms } from "@/components/forms/inquiry-forms";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Start a project conversation with Shapewebs about a custom portfolio, business, or brand website.",
};

export default function ContactPage() {
  return (
    <section className={styles.pageK4m2q8}>
      <div className={styles.headerP7m3q1}>
        <p className={styles.eyebrowT4m8q2}>Contact</p>
        <h1>Start the next website conversation</h1>
        <p>
          Use the general contact form for questions and availability, or send
          the project inquiry form when you are ready to brief a website build.
        </p>
      </div>

      <InquiryForms />
    </section>
  );
}
