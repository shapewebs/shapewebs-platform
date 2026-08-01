import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "../feedback/spinner";
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
  pendingLabel?: string;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
};

export function Button({
  "aria-label": ariaLabel,
  children,
  className,
  disabled,
  kind = "primary",
  leadingIcon,
  pending = false,
  pendingLabel = "Processing",
  size = "medium",
  trailingIcon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={pending || undefined}
      aria-label={pending ? pendingLabel : ariaLabel}
      className={getButtonClassName(kind, size, className)}
      data-component-status="styled"
      disabled={disabled || pending}
      type={type}
      {...props}
    >
      <span className={buttonContentClassName}>
        {pending ? <Spinner announce={false} size="sm" /> : leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
}
