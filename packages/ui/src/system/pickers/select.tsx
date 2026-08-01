import { forwardRef, type SelectHTMLAttributes } from "react";

import { mergeClassNames } from "../_internal/merge-class-names";
import { getControlClassName, type ControlSize } from "../forms/control-styles";
import styles from "./select.module.css";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  controlSize?: ControlSize;
  invalid?: boolean;
  loading?: boolean;
  wrapperClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      "aria-invalid": ariaInvalid,
      className,
      controlSize = "medium",
      invalid = false,
      loading = false,
      wrapperClassName,
      ...props
    },
    ref,
  ) {
    const isInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

    return (
      <span
        className={mergeClassNames(
          styles["select-root-cjfzcb"],
          wrapperClassName,
        )}
        data-component-status="styled"
        data-slot="select"
      >
        <select
          {...props}
          aria-busy={loading || undefined}
          aria-invalid={isInvalid || undefined}
          className={getControlClassName({
            className: mergeClassNames(
              styles["select-control-w190oc"],
              className,
            ),
            invalid: isInvalid,
            kind: "select",
            loading,
            size: controlSize,
          })}
          ref={ref}
        />
        <svg
          aria-hidden="true"
          className={styles["select-icon-04c36z"]}
          viewBox="0 0 16 16"
        >
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" />
        </svg>
      </span>
    );
  },
);
