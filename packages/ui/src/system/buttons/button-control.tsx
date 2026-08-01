import type { ButtonHTMLAttributes, ReactNode } from "react";

import {
  buttonContentClassName,
  getButtonClassName,
  type ButtonKind,
  type ButtonSize,
} from "./button-styles";

export type ButtonControlProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind;
  leadingIcon?: ReactNode;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
};

/**
 * The synchronous visual button primitive. Use Button when an action also
 * needs the shared pending state and spinner behavior.
 */
export function ButtonControl({
  children,
  className,
  kind = "primary",
  leadingIcon,
  size = "medium",
  trailingIcon,
  type = "button",
  ...props
}: ButtonControlProps) {
  return (
    <button
      className={getButtonClassName(kind, size, className)}
      data-component-status="styled"
      type={type}
      {...props}
    >
      <span className={buttonContentClassName}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
}
