import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { ensureStartup } from "@/src/lib/startup";
import { Providers } from "@/src/components/Providers";
import "./globals.css";

ensureStartup();

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Data Contract Hub",
  description: "Catalog, review and edit enterprise data contracts in one unified workspace."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full" lang="en" style={{ overflowY: "scroll" }}>
      <body className={`${manrope.variable} ${ibmPlexMono.variable} app-body h-full`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
