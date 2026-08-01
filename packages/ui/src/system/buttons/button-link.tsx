import NextLink, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import {
  buttonContentClassName,
  getButtonClassName,
  type ButtonKind,
  type ButtonSize,
} from "./button-styles";

export type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
    kind?: ButtonKind;
    leadingIcon?: ReactNode;
    size?: ButtonSize;
    trailingIcon?: ReactNode;
  };

export function ButtonLink({
  children,
  className,
  kind = "primary",
  leadingIcon,
  prefetch = false,
  size = "medium",
  trailingIcon,
  ...props
}: ButtonLinkProps) {
  return (
    <NextLink
      className={getButtonClassName(kind, size, className)}
      data-component-status="styled"
      prefetch={prefetch}
      {...props}
    >
      <span className={buttonContentClassName}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </NextLink>
  );
}
