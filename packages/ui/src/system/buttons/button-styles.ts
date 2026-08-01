import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./button.module.css";

export type ButtonKind =
  "brand" | "danger" | "ghost" | "primary" | "secondary" | "tertiary";
export type ButtonSize = "large" | "medium" | "small";

function getKindClass(kind: ButtonKind) {
  switch (kind) {
    case "brand":
      return styles["button-brand-51suc5"];
    case "danger":
      return styles["button-danger-vqcuvj"];
    case "ghost":
      return styles["button-ghost-ddydm0"];
    case "secondary":
      return styles["button-secondary-p1w9wi"];
    case "tertiary":
      return styles["button-tertiary-cuf09x"];
    default:
      return styles["button-primary-ousybq"];
  }
}

function getSizeClass(size: ButtonSize) {
  switch (size) {
    case "large":
      return styles["button-large-7uqlml"];
    case "small":
      return styles["button-small-f9x44e"];
    default:
      return styles["button-medium-sr2thy"];
  }
}

export function getButtonClassName(
  kind: ButtonKind,
  size: ButtonSize,
  className?: string,
) {
  return mergeClassNames(
    styles["button-root-4mdhtc"],
    getKindClass(kind),
    getSizeClass(size),
    className,
  );
}

export const buttonContentClassName = styles["button-content-0radnf"];
