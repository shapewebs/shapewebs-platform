import { forwardRef } from "react";

import { getControlClassName } from "./control-styles";
import { type InputProps } from "./input";

export type NumberFieldProps = InputProps;

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField(
    {
      "aria-invalid": ariaInvalid,
      className,
      controlSize = "medium",
      invalid = false,
      loading = false,
      type = "number",
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
        className={getControlClassName({
          className,
          invalid: isInvalid,
          kind: "number",
          loading,
          size: controlSize,
        })}
        data-component-status="styled"
        data-slot="number-field"
        ref={ref}
        type={type}
      />
    );
  },
);
