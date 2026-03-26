import Script from "next/script";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />

      <div className="mx-auto max-w-7xl px-6 pb-4 pt-6">
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-1 text-sm text-gray-500">Swagger UI powered by the generated `/api/openapi` specification.</p>
      </div>

      <div id="swagger-ui" />

      <Script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" strategy="afterInteractive" />
      <Script id="swagger-init" strategy="afterInteractive">
        {`
          window.addEventListener('load', function () {
            if (!window.SwaggerUIBundle) return;
            window.SwaggerUIBundle({
              url: '/api/openapi',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [window.SwaggerUIBundle.presets.apis],
              layout: 'BaseLayout'
            });
          });
        `}
      </Script>
    </main>
  );
}
