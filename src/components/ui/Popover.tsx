"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@/src/lib/format";

type PopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function Popover({ children, className, contentClassName, onOpenChange, open, trigger }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  return (
    <div className={cn("ui-popover", className)} ref={ref}>
      {trigger({ open, toggle: () => onOpenChange(!open) })}
      {open ? <div className={cn("ui-popover-content", contentClassName)}>{children}</div> : null}
    </div>
  );
}
