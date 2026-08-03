"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="site-nav-user__logout"
      onClick={async () => {
        try {
          await signOut({ redirect: false });
        } catch {
          // CSRF rate limit — fall through to cookie cleanup
        }
        document.cookie.split(";").forEach((c) => {
          const [name] = c.split("=");
          document.cookie = `${name.trim()}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0`;
        });
        window.location.href = "/login";
      }}
      type="button"
    >
      Log out
    </button>
  );
}
