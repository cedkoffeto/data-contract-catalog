"use client";

import { useEffect } from "react";
import { getClientSessionId } from "@/src/lib/audit-session";

export function AuditSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getClientSessionId();
  }, []);

  return <>{children}</>;
}
