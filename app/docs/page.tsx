"use client";

import dynamic from "next/dynamic";

const SwaggerDocsClient = dynamic(
  () => import("./SwaggerDocsClient").then((m) => m.SwaggerDocsClient),
  { ssr: false },
);

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-1 text-sm text-gray-500">Swagger UI powered by the generated `/api/openapi` specification.</p>
      </div>

      <SwaggerDocsClient />
    </main>
  );
}
