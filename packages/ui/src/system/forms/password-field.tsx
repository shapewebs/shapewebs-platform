"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "../buttons/button";
import { Description } from "./description";
import { FieldError } from "./field-error";
import { Input, type InputProps } from "./input";
import { InputGroup } from "./input-group";
import { Label } from "./label";
import styles from "./password-field.module.css";

export type PasswordFieldProps = Omit<InputProps, "type"> & {
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
};

export function PasswordField({
  "aria-describedby": ariaDescribedBy,
  controlSize = "large",
  description,
  error,
  id,
  invalid = false,
  label,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId();
  const [revealed, setRevealed] = useState(false);
  const fieldId = id ?? `password-${generatedId}`;
  const descriptionId = description ? `${fieldId}-description` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId, errorId]
    .filter(Boolean)
    .join(" ");
  const isInvalid = invalid || Boolean(error);

  return (
    <div
      className={styles["passwordfield-root-9q97hn"]}
      data-component-status="styled"
      data-slot="password-field"
    >
      <div className={styles["passwordfield-heading-mw3vgk"]}>
        <Label htmlFor={fieldId}>{label}</Label>
        {description ? (
          <Description id={descriptionId}>{description}</Description>
        ) : null}
      </div>
      <InputGroup
        className={styles["passwordfield-control-v6adcb"]}
        invalid={isInvalid}
      >
        <Input
          {...props}
          aria-describedby={describedBy || undefined}
          controlSize={controlSize}
          id={fieldId}
          invalid={isInvalid}
          type={revealed ? "text" : "password"}
        />
        <Button
          aria-controls={fieldId}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          className={styles["passwordfield-action-kg2vfx"]}
          disabled={props.disabled}
          kind="ghost"
          onClick={() => setRevealed((current) => !current)}
          size="small"
          type="button"
        >
          {revealed ? (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9 5.2 9 5.2a16 16 0 0 1-2.1 2.7M6.6 6.6A16 16 0 0 0 3 9.2S6.5 14.4 12 14.4c1 0 1.9-.2 2.7-.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M3 9.2S6.5 4 12 4s9 5.2 9 5.2-3.5 5.2-9 5.2S3 9.2 3 9.2Z"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.7"
              />
              <circle
                cx="12"
                cy="9.2"
                fill="none"
                r="2.4"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          )}
        </Button>
      </InputGroup>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
