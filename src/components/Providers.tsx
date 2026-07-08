"use client";

import { SessionProvider } from "next-auth/react";
import { AuditSessionProvider } from "@/src/components/AuditSessionProvider";
import { ToastProvider } from "@/src/components/ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuditSessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuditSessionProvider>
    </SessionProvider>
  );
}
