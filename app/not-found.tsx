import Link from "next/link";

import { PageShell } from "@/src/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto max-w-7xl px-6 pb-8 pt-10 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">Contrat introuvable</h2>
          <p className="mt-2 text-sm text-gray-500">La ressource demandée n'existe pas.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Retour au catalogue
          </Link>
        </div>
      </main>
    </PageShell>
  );
}
