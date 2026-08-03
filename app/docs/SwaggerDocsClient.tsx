"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    SwaggerUIBundle?: ((options: Record<string, unknown>) => unknown) & {
      presets?: {
        apis?: unknown;
      };
    };
  }
}

function ensureStylesheet(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.body.appendChild(script);
  });
}

export function SwaggerDocsClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function mountSwagger() {
      try {
        ensureStylesheet("https://unpkg.com/swagger-ui-dist@5/swagger-ui.css");
        await loadScript("https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js");

        if (isCancelled || !window.SwaggerUIBundle) {
          return;
        }

        window.SwaggerUIBundle({
          url: "/api/openapi",
          dom_id: "#swagger-ui",
          deepLinking: true,
          presets: window.SwaggerUIBundle.presets?.apis ? [window.SwaggerUIBundle.presets.apis] : [],
          layout: "BaseLayout"
        });
      } catch (nextError) {
        if (!isCancelled) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load API documentation");
        }
      }
    }

    void mountSwagger();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <>
      {error ? (
        <div className="mx-auto max-w-7xl px-6 pb-4">
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        </div>
      ) : null}
      <div id="swagger-ui" className="min-h-[70vh]" />
    </>
  );
}
