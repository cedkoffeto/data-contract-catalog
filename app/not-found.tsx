import Link from "next/link";

import { GoBackButton } from "@/src/components/ui/GoBackButton";
import { PageShell } from "@/src/components/layout/PageShell";

export default function NotFound() {
  return (
    <PageShell footerVersion="">
      <main className="pb-7">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-6 pb-8 pt-10 lg:px-8">
          <div className="w-full max-w-xl rounded-xl border bg-white shadow-lg">
            <div className="p-12 text-center">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                  <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900">Contrat introuvable</p>
                <h1 className="text-7xl font-bold text-gray-400">404</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">La ressource demandée n'existe pas.</p>
            </div>
            <div className="flex items-center justify-center gap-3 border-t border-gray-100 px-20 pb-12 pt-4">
              <Link
                href="/"
                className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
              >
                Retour au catalogue
              </Link>
              <GoBackButton />
            </div>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
