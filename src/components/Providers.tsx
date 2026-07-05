"use client";

import { SessionProvider } from "next-auth/react";
import { AuditSessionProvider } from "@/src/components/AuditSessionProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuditSessionProvider>{children}</AuditSessionProvider>
    </SessionProvider>
  );
}
