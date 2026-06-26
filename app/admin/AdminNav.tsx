"use client";

import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4a1 1 0 011-1h2zM3 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 011-1h2z",
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
    icon: "M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z",
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
