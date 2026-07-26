"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";

const feedback: Record<string, string> = {
  invalid_image:
    "That image could not be accepted. Use a valid JPEG, PNG, or WebP image.",
  invalid_request: "Review the fields and select one valid image.",
  payload_too_large:
    "The upload is too large. The source image limit is 4 MiB.",
  service_unavailable:
    "Private media storage is not available in this environment yet.",
  unsupported_media_type: "Choose a JPEG, PNG, or WebP image.",
  upload_failed:
    "The upload could not be completed safely. Nothing was acknowledged.",
};

export function MediaUploadForm() {
  const formReference = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/media", {
          body: formData,
          method: "POST",
        });
        const result = (await response.json()) as {
          error?: string;
          status?: string;
        };

        if (!response.ok) {
          setMessage(
            feedback[result.error ?? ""] ??
              "The upload could not be completed safely.",
          );
          return;
        }

        formReference.current?.reset();
        setMessage("Private image uploaded and verified.");
        router.refresh();
      } catch {
        setMessage("The upload could not be completed safely.");
      }
    });
  }

  return (
    <form
      action={submit}
      className={styles["sw-media-form-b7n2q5"]}
      ref={formReference}
    >
      <div className={styles["sw-media-fields-n4v8q1"]}>
        <label className={styles["sw-media-field-p8m3k2"]}>
          <span>Image</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            disabled={isPending}
            name="file"
            required
            type="file"
          />
          <small>JPEG, PNG, or WebP. Maximum source size: 4 MiB.</small>
        </label>

        <label className={styles["sw-media-field-p8m3k2"]}>
          <span>Alt text</span>
          <input
            disabled={isPending}
            maxLength={180}
            name="altText"
            required
            type="text"
          />
          <small>
            Describe the image’s purpose for people using a screen reader.
          </small>
        </label>

        <label className={styles["sw-media-field-p8m3k2"]}>
          <span>Caption (optional)</span>
          <input
            disabled={isPending}
            maxLength={280}
            name="caption"
            type="text"
          />
        </label>

        <label className={styles["sw-media-field-p8m3k2"]}>
          <span>Locale</span>
          <select defaultValue="en" disabled={isPending} name="localeCode">
            <option value="en">English</option>
            <option value="da-DK">Dansk</option>
          </select>
        </label>
      </div>

      <button
        className={styles["sw-media-submit-x6p1m9"]}
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Verifying and uploading…" : "Upload private image"}
      </button>

      <p
        aria-live="polite"
        className={styles["sw-media-feedback-j3q7m4"]}
        role="status"
      >
        {message}
      </p>
    </form>
  );
}
