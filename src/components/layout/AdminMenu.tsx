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
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/roles", label: "Roles" },
    { href: "/admin/users", label: "Users" },
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
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
