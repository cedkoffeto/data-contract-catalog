"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const links = [
    { href: "/admin", label: "Dashboard", icon: "M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4a1 1 0 011-1h2zM3 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 011-1h2z" },
    { href: "/admin/groups", label: "Groups", icon: "M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" },
    { href: "/admin/policies", label: "Policies", icon: "M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.578c.068.526.104 1.062.104 1.606 0 5.101-3.12 9.695-7.491 11.511a.531.531 0 01-.418 0C6.12 16.865 3 12.271 3 7.17c0-.544.036-1.08.104-1.606a.5.5 0 01.48-.578 11.947 11.947 0 007.077-2.749z" },
  ];

  return (
    <div className="site-nav-admin" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        className={`site-nav-admin__trigger${isOpen ? " site-nav-admin__trigger--open" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        Admin
        <svg className="site-nav-admin__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen ? (
        <div className="site-nav-admin__menu" role="menu">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                className={`site-nav-admin__link${isActive ? " site-nav-admin__link--active" : ""}`}
                href={link.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ marginRight: "0.5rem" }}>
                  <path d={link.icon} />
                </svg>
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
