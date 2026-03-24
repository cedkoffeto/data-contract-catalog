import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Contrat de données",
  description: "Catalogue des Data Contrats"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="h-full bg-gray-100" lang="en">
      <body className="h-full">{children}</body>
    </html>
  );
}
