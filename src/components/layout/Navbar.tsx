import Image from "next/image";
import Link from "next/link";

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
              <span className="site-nav__title">Data Contracts</span>
            </div>
          </Link>

          <div className="site-nav__actions">
            <div className="site-nav__links">
              <Link className="site-nav__link" href="/">
                Catalog
              </Link>
              <Link className="site-nav__link" href="/docs">
                Api
              </Link>
              {isAdmin && <AdminMenu />}
            </div>

            <Link className="site-nav__cta" href="/editor">
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
