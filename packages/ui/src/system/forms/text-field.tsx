import { forwardRef } from "react";

import { Input, type InputProps } from "./input";

export type TextFieldProps = InputProps;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(props, ref) {
    return <Input {...props} data-slot="text-field" ref={ref} />;
  },
);
