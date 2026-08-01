import { forwardRef } from "react";

import { getControlClassName } from "./control-styles";
import { type InputProps } from "./input";

export type SearchFieldProps = InputProps;

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    {
      "aria-invalid": ariaInvalid,
      className,
      controlSize = "medium",
      invalid = false,
      loading = false,
      type = "search",
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
          kind: "search",
          loading,
          size: controlSize,
        })}
        data-component-status="styled"
        data-slot="search-field"
        ref={ref}
        type={type}
      />
    );
  },
);
