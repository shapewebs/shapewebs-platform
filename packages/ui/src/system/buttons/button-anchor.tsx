import type { AnchorHTMLAttributes, ReactNode } from "react";

import {
  buttonContentClassName,
  getButtonClassName,
  type ButtonKind,
  type ButtonSize,
} from "./button-styles";

export type ButtonAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  kind?: ButtonKind;
  leadingIcon?: ReactNode;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
};

export function ButtonAnchor({
  children,
  className,
  kind = "primary",
  leadingIcon,
  size = "medium",
  trailingIcon,
  ...props
}: ButtonAnchorProps) {
  return (
    <a
      className={getButtonClassName(kind, size, className)}
      data-component-status="styled"
      {...props}
    >
      <span className={buttonContentClassName}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </a>
  );
}
