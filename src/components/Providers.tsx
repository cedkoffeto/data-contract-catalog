"use client";

import { SessionProvider } from "next-auth/react";
import { AuditSessionProvider } from "@/src/components/AuditSessionProvider";
import { ToastProvider } from "@/src/components/ui/ToastProvider";
import type { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false}>
      <AuditSessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuditSessionProvider>
    </SessionProvider>
  );
}
