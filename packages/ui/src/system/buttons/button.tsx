import type { ReactNode } from "react";
import { Spinner } from "../feedback/spinner";
import { ButtonControl, type ButtonControlProps } from "./button-control";

export type ButtonProps = ButtonControlProps & {
  leadingIcon?: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
};

export function Button({
  "aria-label": ariaLabel,
  children,
  className,
  disabled,
  leadingIcon,
  pending = false,
  pendingLabel = "Processing",
  ...props
}: ButtonProps) {
  return (
    <ButtonControl
      aria-busy={pending || undefined}
      aria-label={pending ? pendingLabel : ariaLabel}
      className={className}
      disabled={disabled || pending}
      leadingIcon={
        pending ? <Spinner announce={false} size="sm" /> : leadingIcon
      }
      {...props}
    >
      {children}
    </ButtonControl>
  );
}
