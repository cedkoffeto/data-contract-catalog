"use client";

import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Administration",
    icon: "M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z",
  },
  {
    href: "/admin/groups",
    label: "Groups",
    icon: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z",
  },
  {
    href: "/admin/policies",
    label: "Policies",
    icon: "M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.578c.068.526.104 1.062.104 1.606 0 5.101-3.12 9.695-7.491 11.511a.531.531 0 01-.418 0C6.12 16.865 3 12.271 3 7.17c0-.544.036-1.08.104-1.606a.5.5 0 01.48-.578 11.947 11.947 0 007.077-2.749z",
  },
  {
    href: "/data-model",
    label: "Data Model",
    icon: "M10 3C5.58 3 2 4.12 2 5.5v9c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-9C18 4.12 14.42 3 10 3zm0 2c3.87 0 6 .87 6 1.5S13.87 8 10 8s-6-.87-6-1.5S6.13 5 10 5zm6 9.5c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5v-2.23c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V14.5zm0-4c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5V8.27c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V10.5z",
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="ml-auto flex gap-4 text-sm">
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
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}
