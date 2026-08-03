import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/src/lib/format";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  children: ReactNode;
};

export function Checkbox({ checked, children, className, ...props }: CheckboxProps) {
  return (
    <label className={cn("ui-checkbox", className)}>
      <span className={cn("ui-checkbox-box", checked ? "ui-checkbox-box--checked" : undefined)} aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" className="ui-checkbox-icon">
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <input checked={checked} className="ui-checkbox-input" type="checkbox" {...props} />
      <span className="ui-checkbox-label">{children}</span>
    </label>
  );
}
