import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./button.module.css";

export type ButtonKind =
  "danger" | "ghost" | "primary" | "secondary" | "tertiary";
export type ButtonSize = "large" | "medium" | "small";

function getKindClass(kind: ButtonKind) {
  switch (kind) {
    case "danger":
      return styles["sw-button-danger-k1x7a4"];
    case "ghost":
      return styles["sw-button-ghost-j9w6z3"];
    case "secondary":
      return styles["sw-button-secondary-g7t4x1"];
    case "tertiary":
      return styles["sw-button-tertiary-h8v5y2"];
    default:
      return styles["sw-button-primary-f6s3w9"];
  }
}

function getSizeClass(size: ButtonSize) {
  switch (size) {
    case "large":
      return styles["sw-button-large-e5r2v8"];
    case "small":
      return styles["sw-button-small-c3p9s6"];
    default:
      return styles["sw-button-medium-d4q1t7"];
  }
}

export function getButtonClassName(
  kind: ButtonKind,
  size: ButtonSize,
  className?: string,
) {
  return mergeClassNames(
    styles["sw-button-root-a1m7q4"],
    getKindClass(kind),
    getSizeClass(size),
    className,
  );
}

export const buttonContentClassName = styles["sw-button-content-b2n8r5"];
