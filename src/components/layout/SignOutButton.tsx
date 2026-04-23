"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button className="site-nav-user__logout" onClick={() => void signOut({ callbackUrl: "/login" })} type="button">
      Log out
    </button>
  );
}
