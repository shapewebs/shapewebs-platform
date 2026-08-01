import { mergeClassNames } from "../_internal/merge-class-names";
import styles from "./control.module.css";

export type ControlSize = "large" | "medium" | "small";

type ControlStyleOptions = {
  className?: string;
  invalid?: boolean;
  loading?: boolean;
  multiline?: boolean;
  kind?: "input" | "number" | "otp" | "search" | "select";
  size?: ControlSize;
};

function getSizeClass(size: ControlSize) {
  switch (size) {
    case "small":
      return styles["control-small-vcnrsi"];
    case "large":
      return styles["control-large-8q2fri"];
    default:
      return styles["control-medium-9laljb"];
  }
}

function getKindClass(kind: NonNullable<ControlStyleOptions["kind"]>) {
  switch (kind) {
    case "number":
      return styles["control-number-tm67rr"];
    case "otp":
      return styles["control-otp-kja4bh"];
    case "search":
      return styles["control-search-kwj2xx"];
    case "select":
      return styles["control-select-gvzf02"];
    default:
      return undefined;
  }
}

export function getControlClassName({
  className,
  invalid = false,
  kind = "input",
  loading = false,
  multiline = false,
  size = "medium",
}: ControlStyleOptions) {
  return mergeClassNames(
    styles["control-root-8imqbv"],
    getSizeClass(size),
    getKindClass(kind),
    invalid ? styles["control-invalid-q39s57"] : undefined,
    loading ? styles["control-loading-q80akn"] : undefined,
    multiline ? styles["control-multiline-pba99i"] : undefined,
    className,
  );
}
