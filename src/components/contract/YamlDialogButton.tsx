"use client";

import { useId, useRef } from "react";

export function YamlDialogButton({ yamlRaw }: { yamlRaw: string }) {
  const id = useId().replace(/:/g, "");
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
      >
        <svg className="-ml-0.5 mr-1.5 h-5 w-5 text-gray-600" viewBox="-0.5 -0.5 24 24">
          <path d="m4.3125 8.145833333333334 9.104166666666668 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m4.3125 11.020833333333334 9.104166666666668 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m4.3125 5.270833333333334 6.708333333333334 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m4.3125 13.895833333333334 7.1875 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m4.3125 16.770833333333336 3.8333333333333335 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="M8.145833333333334 22.520833333333336h-6.708333333333334a0.9583333333333334 0.9583333333333334 0 0 1 -0.9583333333333334 -0.9583333333333334v-20.125a0.9583333333333334 0.9583333333333334 0 0 1 0.9583333333333334 -0.9583333333333334h12.739125a0.9583333333333334 0.9583333333333334 0 0 1 0.6775416666666667 0.28079166666666666L18.406708333333334 4.3125a0.9583333333333334 0.9583333333333334 0 0 1 0.28079166666666666 0.6775416666666667V8.145833333333334" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m15.045833333333333 21.370833333333334 -4.025 1.15 1.15 -4.025 6.879875 -6.879875a2.032625 2.032625 0 0 1 2.875 2.875Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m18.188208333333332 12.478458333333334 2.875 2.875" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path><path d="m12.170833333333333 18.495833333333334 2.875 2.875" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"></path>
        </svg>
        Afficher le YAML
      </button>

      <dialog ref={dialogRef} id={`dialog-datacontract-yaml-${id}`} className="relative z-10" aria-labelledby="modal-title" aria-modal="true">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-4/5 sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div>
                <div className="mb-3 mt-3 text-center sm:mt-5">
                  <h3 className="text-base font-semibold leading-6 text-gray-900" id="modal-title">
                    YAML du contrat de données
                  </h3>
                </div>
                <pre className="overflow-x-auto bg-gray-50 p-4 text-sm">
                  <code>{yamlRaw}</code>
                </pre>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
