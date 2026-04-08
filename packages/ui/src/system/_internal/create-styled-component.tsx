import { createElement } from "react";
import type { JSX, ReactNode } from "react";
import { mergeClassNames } from "./merge-class-names";

type StyledComponentProps = {
  as?: keyof JSX.IntrinsicElements;
  children?: ReactNode;
  className?: string;
} & Record<string, unknown>;

export function createStyledComponent(
  defaultTag: keyof JSX.IntrinsicElements,
  baseClassName: string,
  status: "scaffolded" | "styled" = "scaffolded",
) {
  return function StyledComponent({
    as,
    className,
    ...props
  }: StyledComponentProps) {
    const Component = as ?? defaultTag;

    return createElement(Component, {
      ...props,
      className: mergeClassNames(baseClassName, className),
      "data-component-status": status,
    });
  };
}
