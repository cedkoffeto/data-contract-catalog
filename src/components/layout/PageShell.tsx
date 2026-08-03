import type { ReactNode } from "react";

import { Footer } from "@/src/components/layout/Footer";
import { Navbar } from "@/src/components/layout/Navbar";

export function PageShell({
  children,
  footerVersion,
  showFooter = true,
  scrollable = true,
}: {
  children: ReactNode;
  footerVersion?: string;
  showFooter?: boolean;
  scrollable?: boolean;
}) {
  return (
    <div className="app-shell h-full flex flex-col">
      <Navbar />
      <div className={`flex-1 min-h-0 flex flex-col ${scrollable ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden"}`}>
        {children}
      </div>
      {showFooter ? <Footer version={footerVersion} /> : null}
    </div>
  );
}
