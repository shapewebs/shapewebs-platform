import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  buttonContentClassName,
  getButtonClassName,
  type ButtonKind,
  type ButtonSize,
} from "./button-styles";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: ButtonKind;
  leadingIcon?: ReactNode;
  pending?: boolean;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
};

export function Button({
  children,
  className,
  disabled,
  kind = "primary",
  leadingIcon,
  pending = false,
  size = "medium",
  trailingIcon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={pending || undefined}
      className={getButtonClassName(kind, size, className)}
      data-component-status="styled"
      disabled={disabled || pending}
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
