import type { ReactNode } from "react";

import { cn } from "@/src/lib/format";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("ui-badge", className)}>{children}</span>;
}
