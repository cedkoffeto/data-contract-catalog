import Image from "next/image";
import Link from "next/link";

import { t } from "@/src/lib/i18n";
import { auth } from "@/src/auth";
import { AdminMenu } from "@/src/components/layout/AdminMenu";
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
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                Data Model
              </Link>
              {isAdmin && <AdminMenu />}
            </div>

            <Link className="site-nav__cta" href="/editor">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M13.586 2.586a2 2 0 012.828 0l.828.828a2 2 0 010 2.828l-9.172 9.172a2 2 0 01-1.068.566l-3.11.518a1 1 0 01-1.112-1.112l.518-3.11a2 2 0 01.566-1.068l9.172-9.172zM15.414 4.414a.5.5 0 00-.707 0l-1.06 1.06 1.768 1.768 1.06-1.06a.5.5 0 000-.707l-.828-.828z" />
              </svg>
              Editor
            </Link>

            {session ? <NotificationBell /> : null}

            {session ? <UserMenu email={session.user?.email} image={session.user?.image} name={session.user?.name ?? displayName} givenName={(session.user as Record<string, unknown>)?.givenName as string | undefined} familyName={(session.user as Record<string, unknown>)?.familyName as string | undefined} userId={session.user?.name ?? undefined} /> : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
