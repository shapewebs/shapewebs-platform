import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "small" | "medium" | "large";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

const kindClassMap = {
  primary: styles.kindPrimary,
  secondary: styles.kindSecondary,
  tertiary: styles.kindTertiary,
  ghost: styles.kindGhost,
} as const;

const sizeClassMap = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
} as const;

export function Button({
  children,
  className,
  kind = "primary",
  leadingIcon,
  size = "medium",
  trailingIcon,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={mergeClassNames(
        styles.root,
        kindClassMap[kind],
        sizeClassMap[size],
        className,
      )}
      data-component-status="styled"
      type={type}
      {...props}
    >
      <span className={styles.content}>
        {leadingIcon}
        {children}
        {trailingIcon}
      </span>
    </button>
  );
}
