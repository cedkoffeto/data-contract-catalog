"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLocale, dictionaries, type Locale } from "@/src/lib/i18n";

interface NavLink {
  href: string;
  labelKey: keyof typeof import("@/src/lib/i18n").dictionaries.en;
  icon: string;
}

const links: NavLink[] = [
  { href: "/admin", labelKey: "adminTitle", icon: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" },
  { href: "/admin/groups", labelKey: "adminGroups", icon: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" },
  { href: "/admin/policies", labelKey: "adminPolicies", icon: "M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.578c.068.526.104 1.062.104 1.606 0 5.101-3.12 9.695-7.491 11.511a.531.531 0 01-.418 0C6.12 16.865 3 12.271 3 7.17c0-.544.036-1.08.104-1.606a.5.5 0 01.48-.578 11.947 11.947 0 007.077-2.749z" },
  { href: "/data-model", labelKey: "dataModel", icon: "M10 3C5.58 3 2 4.12 2 5.5v9c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-9C18 4.12 14.42 3 10 3zm0 2c3.87 0 6 .87 6 1.5S13.87 8 10 8s-6-.87-6-1.5S6.13 5 10 5zm6 9.5c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5v-2.23c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V14.5zm0-4c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5V8.27c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V10.5z" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLocale(getLocale());
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const dict = dictionaries[locale];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="ml-auto inline-flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Z" />
          </svg>
        )}
      </button>

      <nav className="ml-auto hidden flex-wrap items-center gap-4 text-sm md:flex">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 ${isActive ? "font-semibold" : "text-gray-600 hover:text-gray-900"}`}
              style={isActive ? { color: "var(--ui-primary)" } : undefined}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d={link.icon} />
              </svg>
              {dict[link.labelKey]}
            </a>
          );
        })}
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-56 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {dict["adminTitle"]}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close menu"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <div className="py-2">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                      isActive
                        ? "font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    style={isActive ? { color: "var(--ui-primary)", backgroundColor: "rgba(249,115,22,0.06)" } : undefined}
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d={link.icon} />
                    </svg>
                    {dict[link.labelKey]}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
