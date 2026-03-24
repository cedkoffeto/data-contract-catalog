import type { ReactNode } from "react";

import { Footer } from "@/src/components/layout/Footer";
import { Navbar } from "@/src/components/layout/Navbar";

export function PageShell({ children, footerVersion }: { children: ReactNode; footerVersion?: string }) {
  return (
    <div className="min-h-full flex flex-col">
      <Navbar />
      {children}
      <Footer version={footerVersion} />
    </div>
  );
}
