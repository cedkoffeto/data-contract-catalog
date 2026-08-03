"use client";

import Link from "next/link";

import { GoBackButton } from "@/src/components/ui/GoBackButton";

export default function AdminError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <nav className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
        <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.409.762.832.846.252.05.5.115.744.193a1.01 1.01 0 0 0 1.115-.39l.594-.74c.295-.367.89-.408 1.22-.112l.773.76c.32.314.34.818.043 1.158l-.548.631a1.01 1.01 0 0 0-.148 1.146c.182.364.34.741.474 1.13.097.284.396.475.697.443l.776-.083c.42-.045.8.269.808.68v.998c.008.41-.388.726-.808.68l-.776-.084a.653.653 0 0 0-.697.443 8.269 8.269 0 0 1-.474 1.13 1.01 1.01 0 0 0 .148 1.146l.548.631c.297.34.277.844-.043 1.158l-.773.76c-.33.296-.925.255-1.22-.112l-.594-.74a1.01 1.01 0 0 0-1.115-.39c-.245.078-.492.142-.744.193a.845.845 0 0 0-.832.846l-.149.894c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.149-.894a.845.845 0 0 0-.832-.846 8.55 8.55 0 0 1-.744-.193 1.01 1.01 0 0 0-1.115.39l-.594.74c-.295.367-.89.408-1.22.112l-.773-.76c-.32-.314-.34-.818-.043-1.158l.548-.631a1.01 1.01 0 0 0 .148-1.146 8.27 8.27 0 0 1-.474-1.13.653.653 0 0 0-.697-.443l-.776.084c-.42.045-.8-.27-.808-.68v-.998c-.008-.41.388-.726.808-.68l.776.084c.301.032.6-.159.697-.443a8.267 8.267 0 0 1 .474-1.13 1.01 1.01 0 0 0-.148-1.146l-.548-.631c-.297-.34-.277-.844.043-1.158l.773-.76c.33-.296.925-.255 1.22.112l.594.74a1.01 1.01 0 0 0 1.115.39 8.55 8.55 0 0 1 .744-.193.845.845 0 0 0 .832-.846l.149-.894Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span>Administration</span>
        </Link>
      </nav>
      <div className="flex flex-1 flex-col">
        <main className="pb-7">
          <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
            <div className="w-full max-w-xl rounded-xl border border-[#d1d5db] bg-white shadow-lg">
              <div className="p-12 text-center">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                    <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-900">Erreur serveur</p>
                  <h1 className="text-7xl font-bold text-orange-500">500</h1>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Une erreur inattendue s&apos;est produite dans l&apos;interface d&apos;administration.
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
                  href="/admin"
                  className="catalog-primary-link"
                >
                  Retour à l&apos;administration
                </Link>
                <GoBackButton />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
