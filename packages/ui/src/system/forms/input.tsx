import { forwardRef, type InputHTMLAttributes } from "react";

import { getControlClassName, type ControlSize } from "./control-styles";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  controlSize?: ControlSize;
  invalid?: boolean;
  loading?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    "aria-invalid": ariaInvalid,
    className,
    controlSize = "medium",
    invalid = false,
    loading = false,
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
        loading,
        size: controlSize,
      })}
      data-component-status="styled"
      data-slot="input"
      ref={ref}
    />
  );
});
