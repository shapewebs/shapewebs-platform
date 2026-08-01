import { forwardRef, type TextareaHTMLAttributes } from "react";

import { getControlClassName, type ControlSize } from "./control-styles";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  controlSize?: ControlSize;
  invalid?: boolean;
  loading?: boolean;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
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
      <textarea
        {...props}
        aria-busy={loading || undefined}
        aria-invalid={isInvalid || undefined}
        className={getControlClassName({
          className,
          invalid: isInvalid,
          loading,
          multiline: true,
          size: controlSize,
        })}
        data-component-status="styled"
        data-slot="text-area"
        ref={ref}
      />
    );
  },
);
