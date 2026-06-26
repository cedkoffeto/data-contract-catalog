import type { ReactNode } from "react";

import { Footer } from "@/src/components/layout/Footer";
import { Navbar } from "@/src/components/layout/Navbar";

export function PageShell({
  children,
  footerVersion,
  showFooter = true
}: {
  children: ReactNode;
  footerVersion?: string;
  showFooter?: boolean;
}) {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      {showFooter ? <Footer version={footerVersion} /> : null}
    </div>
  );
}
