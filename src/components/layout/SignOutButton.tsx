"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button className="site-nav-user__logout" onClick={async () => { try { await signOut({ callbackUrl: "/login" }); } catch { window.location.href = "/login"; } }} type="button">
      Log out
    </button>
  );
}
