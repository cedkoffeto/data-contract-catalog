import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/src/lib/format";

type ButtonVariant = "outline" | "ghost" | "chip";

const variantClassName: Record<ButtonVariant, string> = {
  outline: "ui-button ui-button--outline",
  ghost: "ui-button ui-button--ghost",
  chip: "ui-button ui-button--chip"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, type = "button", variant = "outline", ...props }: ButtonProps) {
  return (
    <button className={cn(variantClassName[variant], className)} type={type} {...props}>
      {children}
    </button>
  );
}
