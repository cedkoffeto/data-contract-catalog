import Link from "next/link";

import { PageShell } from "@/src/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
          <div className="w-full max-w-sm rounded-xl border bg-white p-8 text-center shadow-lg">
            <h1 className="text-5xl font-bold text-gray-200">404</h1>
            <p className="mt-3 text-base font-semibold text-gray-900">Contrat introuvable</p>
            <p className="mt-1 text-sm text-gray-500">La ressource demandée n'existe pas.</p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
            >
              Retour au catalogue
            </Link>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
