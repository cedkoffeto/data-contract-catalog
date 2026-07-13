"use client";

import Link from "next/link";

export default function DataModelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-white">
      <nav className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38a23.978 23.978 0 0 1-3.327.637m4.5-2.383a3.248 3.248 0 0 1-.673.38 23.978 23.978 0 0 1-3.327.637m0 0a2.284 2.284 0 0 1-.823.047 2.285 2.285 0 0 1-.823-.047m0 0a23.978 23.978 0 0 1-3.327-.637 3.248 3.248 0 0 1-.673-.38m0 0a2.18 2.18 0 0 1-.75-1.661V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m0 0c.321 0 .641.006.96.018" />
          </svg>
          <span>Data Contract Catalog</span>
        </Link>
      </nav>
      <div className="flex flex-1 flex-col">
        <main className="pb-7">
          <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
            <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg">
              <div className="p-12 text-center">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-900">Erreur serveur</p>
                  <h1 className="text-7xl font-bold" style={{ color: "var(--ui-primary, #f97316)" }}>500</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Une erreur inattendue s&apos;est produite lors du chargement du modèle de données.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-20 pb-12 pt-4">
                <button
                  onClick={reset}
                  className="catalog-primary-link"
                >
                  Réessayer
                </button>
                <Link
                  href="/"
                  className="catalog-primary-link"
                >
                  Retour au catalogue
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
