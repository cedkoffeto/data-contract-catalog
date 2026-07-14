"use client";

import Link from "next/link";

import { GoBackButton } from "@/src/components/ui/GoBackButton";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-7">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
          <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg">
            <div className="p-12 text-center">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                  <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">Erreur inattendue</p>
                <h1 className="text-7xl font-bold text-orange-500">500</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Une erreur inattendue s&apos;est produite. Veuillez réessayer ou contacter l&apos;équipe technique.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-20 pb-12 pt-4">
              <button
                onClick={reset}
                className="catalog-primary-link"
              >
                Réessayer
              </button>
              <Link href="/" className="catalog-primary-link">Retour au catalogue</Link>
              <GoBackButton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
