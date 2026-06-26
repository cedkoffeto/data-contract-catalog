import { redirect } from "next/navigation";

import { auth } from "@/src/auth";
import { getUserPermissions } from "@/src/lib/rbac";
import { PageShell } from "@/src/components/layout/PageShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }

  const permissions = await getUserPermissions(session.user.name ?? session.user.email!);

  if (!permissions.includes("admin")) {
    redirect("/");
  }

  return (
    <PageShell footerVersion="V0">
      <main className="mx-auto max-w-[1600px] px-6 pb-8 pt-6 lg:px-8" style={{ overflowX: "hidden" }}>
        <div className="mb-6 flex items-center gap-4 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          <nav className="ml-auto flex gap-4 text-sm">
            <a href="/admin" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4a1 1 0 011-1h2zM3 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm7-1a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 00-1-1h-2zm7 0a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 011-1h2z" />
              </svg>
              Dashboard
            </a>
            <a href="/admin/groups" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              Groups
            </a>
            <a href="/admin/policies" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.578c.068.526.104 1.062.104 1.606 0 5.101-3.12 9.695-7.491 11.511a.531.531 0 01-.418 0C6.12 16.865 3 12.271 3 7.17c0-.544.036-1.08.104-1.606a.5.5 0 01.48-.578 11.947 11.947 0 007.077-2.749z" clipRule="evenodd" />
              </svg>
              Policies
            </a>
          </nav>
        </div>
        {children}
      </main>
    </PageShell>
  );
}
