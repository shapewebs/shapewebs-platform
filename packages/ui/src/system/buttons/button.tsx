import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";
import { mergeClassNames } from "../_internal/merge-class-names";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "small" | "medium" | "large";
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

function getKindClass(kind: NonNullable<ButtonProps["kind"]>) {
  switch (kind) {
    case "secondary":
      return styles.kindSecondary;
    case "tertiary":
      return styles.kindTertiary;
    case "ghost":
      return styles.kindGhost;
    default:
      return styles.kindPrimary;
  }
}

function getSizeClass(size: NonNullable<ButtonProps["size"]>) {
  switch (size) {
    case "small":
      return styles.sizeSmall;
    case "large":
      return styles.sizeLarge;
    default:
      return styles.sizeMedium;
  }
}

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
        getKindClass(kind),
        getSizeClass(size),
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
