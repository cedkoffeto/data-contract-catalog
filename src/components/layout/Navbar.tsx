import Image from "next/image";
import Link from "next/link";

import { t } from "@/src/lib/i18n";
import { auth } from "@/src/auth";
import { AdminMenu } from "@/src/components/layout/AdminMenu";
import { EditorNavLink } from "@/src/components/layout/EditorNavLink";
import { NotificationBell } from "@/src/components/layout/NotificationBell";
import { UserMenu } from "@/src/components/layout/UserMenu";
import { getUserPermissions } from "@/src/lib/rbac";

export async function Navbar() {
  const session = await auth();
  const displayName = session?.user?.name || session?.user?.email || "Connected user";

  const permissions = session?.user?.name ? await getUserPermissions(session.user.name) : [];
  const isAdmin = permissions.includes("admin");

  return (
    <nav className="site-nav">
      <div className="site-nav__inner">
        <div className="site-nav__brand-row">
          <Link className="site-nav__brand" href="/">
            <Image
              alt="Attijariwafa bank"
              className="site-nav__logo"
              height={40}
              priority
              src="/awb-icon.png"
              width={40}
            />
            <div className="site-nav__copy">
              <span className="site-nav__title">{t("appTitle")}</span>
            </div>
          </Link>

          <div className="site-nav__actions">
            <div className="site-nav__links">
              <Link className="site-nav__link" href="/">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
                </svg>
                {t("catalogTitle")}
              </Link>
              <Link className="site-nav__link" href="/docs">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                </svg>
                Api
              </Link>
              <Link className="site-nav__link" href="/data-model">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 3C5.58 3 2 4.12 2 5.5v9c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5v-9C18 4.12 14.42 3 10 3zm0 2c3.87 0 6 .87 6 1.5S13.87 8 10 8s-6-.87-6-1.5S6.13 5 10 5zm6 9.5c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5v-2.23c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V14.5zm0-4c0 .63-2.13 1.5-6 1.5s-6-.87-6-1.5V8.27c1.42.85 3.58 1.23 6 1.23s4.58-.38 6-1.23V10.5z" />
                </svg>
                Data Model
              </Link>
              {isAdmin && <AdminMenu />}
            </div>

            <EditorNavLink />

            {session ? <NotificationBell /> : null}

            {session ? <UserMenu email={session.user?.email} image={session.user?.image} name={session.user?.name ?? displayName} givenName={(session.user as Record<string, unknown>)?.givenName as string | undefined} familyName={(session.user as Record<string, unknown>)?.familyName as string | undefined} userId={session.user?.name ?? undefined} /> : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
