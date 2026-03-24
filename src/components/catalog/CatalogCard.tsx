import Link from "next/link";

import type { CatalogCard as CatalogCardType } from "@/src/lib/types";

export function CatalogCard({ card }: { card: CatalogCardType }) {
  return (
    <li className="col-span-1 rounded-lg bg-white shadow hover:bg-gray-50" data-search={card.searchData}>
      <Link href={card.href}>
        <div className="flex w-full justify-between space-x-1 p-6 pb-4">
          <div className="flex-1 truncate">
            <div className="flex items-center space-x-3">
              <h3 className="truncate text-sm font-medium text-gray-900">{card.title}</h3>
            </div>
            <p className="mt-1 text-sm text-gray-400">{card.version}</p>
            {card.owner ? (
              <div className="mt-1 flex flex-wrap gap-1 text-sm text-gray-500">
                <div className="flex items-center text-sm text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.25"
                    stroke="currentColor"
                    className="mr-1.5 h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                    />
                  </svg>
                  <span>{card.owner}</span>
                </div>
              </div>
            ) : null}
          </div>
          <div className="h-10 w-10 flex-shrink-0 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g>
                <path d="M21.14 6.94a.77.77 0 0 0-.48.2c-1-.8-2.14-.25-3 .72A16.12 16.12 0 0 0 16.15 10a.28.28 0 0 0 .4.32c.08 0 1.39-1.21 1.47-1.28.73-.68 1.35-1.42 1.81-1.48s.32 0 .41.09a19 19 0 0 0-2.07 2.81c0 .12-.31 0 1.53 1.71l.27.24C19 13.57 16 16.73 15.74 17a2.66 2.66 0 0 1-1 .43 3.72 3.72 0 0 1-.22-1.52L17.7 12a.3.3 0 0 0-.47-.37c-.72.88-3.45 3.39-3.69 3.91a4 4 0 0 0 .28 2.62 1 1 0 0 0 .93.32 4.26 4.26 0 0 0 1.76-.65c.6-.62 3.86-4.79 4.65-5.31a20 20 0 0 0 1.77-1.64 4.67 4.67 0 0 0 1-1.37c.5-1.57-1.82-2.66-2.79-2.57Zm1.66 2.33a12.9 12.9 0 0 1-1.58 1.88c-.91 1-.65.74-1 .46-1.52-1.26-1.33-1-1.27-1.21l2-2.16c.34-.38-.06-.45.7-.15.44.16 1.43.63 1.15 1.18Z" fill="#020202" fillRule="evenodd" />
                <path d="M7.2 22.53c-1.48-.25-1.48-2.11-1.61-3.53a40 40 0 0 1 .15-6.57c.18-2.46.6-2.25.59-5.51 0-1.73-.33-4.06-1.79-5a40.29 40.29 0 0 1 6.24.08c2.64.18 5.71-.14 6.91.63C19.23 3.63 18.12 6 19 6a.32.32 0 0 0 .31-.36c-.06-1.31.24-2.44-.81-3.44A5.82 5.82 0 0 0 14.76 1a75.46 75.46 0 0 0-8.57 0C5.77 1 1.6 1.5 1 2.08A3.17 3.17 0 0 0 0 4.5 4.61 4.61 0 0 0 .72 7a1.92 1.92 0 0 0 .93.62c1 .31 3.24.25 2.86-.55C4.4 6.8 3.19 7 3.11 7a2.35 2.35 0 0 1-1.77-.56 3.77 3.77 0 0 1-.48-2 2.31 2.31 0 0 1 .76-1.73 3.54 3.54 0 0 1 1.27-.31c1.11 0 1.64.66 2 1.73a14.13 14.13 0 0 1 .3 4.46 33 33 0 0 0-.55 7c0 1.43.19 5 .84 6.22a2.1 2.1 0 0 0 1.67 1.24.3.3 0 0 0 .05-.52Z" fill="#020202" fillRule="evenodd" />
                <path d="M21.85 19.54a8 8 0 0 1-1.71-3.19.29.29 0 1 0-.57.15c.75 3.33 2.18 4 2.79 4.79-.34.08-13.26 1.1-14 1a.33.33 0 1 0-.09.66c1.61.26 10.59-.22 13.1-.49a3 3 0 0 0 2-.65c.63-.67-.71-1.47-1.52-2.27Z" fill="#020202" fillRule="evenodd" />
                <path d="M9.67 16.86c.39 0 .46.84.5 1.26 0 .13-.07.78.35.95a.51.51 0 0 0 .45 0c1.63-.85.93-.18 1.46-.18.68 0 .56-1.39-1.25-1 0-1.24-.34-2.29-1.59-2.2a2.75 2.75 0 0 0-2.18 1.81 3.92 3.92 0 0 0-.34 1.05c.11 1.84.86-1.68 2.6-1.69Z" fill="#0c6fff" fillRule="evenodd" />
                <path d="M8.57 8.41c5.28.19 2.32 0 6.08 0a.34.34 0 0 0 .35-.35.47.47 0 0 0-.39-.37c-.28-.06-2.1-.3-2.94-.33a17.84 17.84 0 0 0-3.84.48.31.31 0 0 0 .2.53c.09.02.48.04.54.04Z" fill="#0c6fff" fillRule="evenodd" />
                <path d="M13.22 11.64c-5.2-.15-5.49.12-5.57.34a.3.3 0 0 0 .17.38 1.23 1.23 0 0 0 .44.1c.84.06 7.28.38 7.24-.42-.03-.58-1.37-.33-2.28-.4Z" fill="#0c6fff" fillRule="evenodd" />
              </g>
            </svg>
          </div>
        </div>
        <div className="flex w-full items-center justify-between px-6 pb-6">
          <p className="line-clamp-3 text-sm text-gray-500">{card.description}</p>
        </div>
      </Link>
    </li>
  );
}
