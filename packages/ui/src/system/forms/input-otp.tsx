import { forwardRef } from "react";

import { getControlClassName } from "./control-styles";
import { type InputProps } from "./input";

export type InputOtpProps = InputProps;

export const InputOtp = forwardRef<HTMLInputElement, InputOtpProps>(
  function InputOtp(
    {
      "aria-invalid": ariaInvalid,
      autoComplete = "one-time-code",
      className,
      controlSize = "large",
      inputMode = "numeric",
      invalid = false,
      loading = false,
      maxLength = 6,
      pattern = "[0-9]*",
      type = "text",
      ...props
    },
    ref,
  ) {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

    return (
      <input
        {...props}
        aria-busy={loading || undefined}
        aria-invalid={isInvalid || undefined}
        autoComplete={autoComplete}
        className={getControlClassName({
          className,
          invalid: isInvalid,
          kind: "otp",
          loading,
          size: controlSize,
        })}
        data-component-status="styled"
        data-slot="input-otp"
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        ref={ref}
        type={type}
      />
    );
  },
);
