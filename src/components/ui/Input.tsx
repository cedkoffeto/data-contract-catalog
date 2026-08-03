import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/src/lib/format";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  wrapperClassName?: string;
};

export const Input = ({ className, icon, wrapperClassName, ...props }: InputProps) => {
  return (
    <div className={cn("ui-input-shell", wrapperClassName)}>
      {icon ? <span className="ui-input-icon">{icon}</span> : null}
      <input className={cn("ui-input", icon ? "ui-input--with-icon" : undefined, className)} {...props} />
    </div>
  );
};
