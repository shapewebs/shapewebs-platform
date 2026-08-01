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
          {revealed ? "Hide" : "Show"}
        </Button>
      </InputGroup>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
