"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export function UserMenu({
  email,
  image,
  name
}: {
  email?: string | null;
  image?: string | null;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="site-nav-user" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Open user menu"
        className="site-nav-user__trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {image ? (
          <Image alt={name} className="site-nav-user__image" height={32} src={image} width={32} />
        ) : (
          <span className="site-nav-user__initial">{getInitial(name)}</span>
        )}
      </button>

      {isOpen ? (
        <div className="site-nav-user__menu" role="menu">
          <div className="site-nav-user__identity">
            <strong>{name}</strong>
            {email ? <span>{email}</span> : null}
          </div>
          <button
            className="site-nav-user__logout"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            role="menuitem"
            type="button"
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
