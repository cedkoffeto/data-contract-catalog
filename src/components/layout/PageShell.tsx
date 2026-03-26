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
    <div className="app-shell min-h-full flex flex-col">
      <Navbar />
      {children}
      {showFooter ? <Footer version={footerVersion} /> : null}
    </div>
  );
}
