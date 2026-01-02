import type { ComponentChildren } from "preact";

export interface ButtonProps {
  id?: string;
  onClick?: () => void;
  children?: ComponentChildren;
  disabled?: boolean;
  class?: string;
  type?: "button" | "submit" | "reset";
}

export function Button(props: ButtonProps) {
  const { class: className = "", type = "button", ...rest } = props;

  return (
    <button
      {...rest}
      type={type}
      class={`btn btn-primary ${className}`.trim()}
    />
  );
}
