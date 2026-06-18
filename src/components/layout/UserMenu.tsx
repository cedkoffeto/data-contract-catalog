"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";

import { UserPoliciesDialog } from "./UserPoliciesDialog";
import { NotificationPreferencesDialog } from "./NotificationPreferencesDialog";

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

export function UserMenu({
  email,
  image,
  name,
  givenName,
  familyName,
  userId,
}: {
  email?: string | null;
  image?: string | null;
  name: string;
  givenName?: string;
  familyName?: string;
  userId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
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

  function handleShowPolicies() {
    setShowPolicies(true);
    setIsOpen(false);
  }

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
            <div className="flex items-start">
              {image ? (
                <Image alt={name} className="mr-2 mt-0.5 h-4 w-4 shrink-0 rounded-full object-cover" height={16} src={image} width={16} />
              ) : (
                <span className="mr-2 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <svg className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
              )}
              <div className="flex flex-col min-w-0">
                <strong className="truncate" title={`${givenName ?? ""} ${familyName ?? ""}`}>
                  {givenName && familyName ? `${givenName} ${familyName}` : name}
                </strong>
                {name !== (givenName && familyName ? `${givenName} ${familyName}` : name) && <span className="truncate text-[11px] text-gray-400" title={name}>{name}</span>}
                {email ? <span className="truncate text-[11px] text-gray-400" title={email}>{email}</span> : null}
              </div>
            </div>
          </div>
          <button
            className="site-nav-user__link"
            onClick={() => { setShowNotificationPrefs(true); setIsOpen(false); }}
            role="menuitem"
            type="button"
          >
            <svg className="mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            Notification preferences
          </button>
          <button
            className="site-nav-user__link"
            onClick={handleShowPolicies}
            role="menuitem"
            type="button"
          >
            <svg className="mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            My access policies
          </button>
          <button
            className="site-nav-user__logout"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            role="menuitem"
            type="button"
          >
            <svg className="mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Log out
          </button>
        </div>
      ) : null}

      {showNotificationPrefs && (
        <NotificationPreferencesDialog
          onClose={() => setShowNotificationPrefs(false)}
        />
      )}

      {showPolicies && (
        <UserPoliciesDialog
          userId={userId ?? name}
          onClose={() => setShowPolicies(false)}
        />
      )}
    </div>
  );
}
