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
      <main className="mx-auto max-w-7xl px-6 pb-8 pt-6 lg:px-8" style={{ overflowX: "hidden" }}>
        <div className="mb-6 flex items-center gap-4 border-b border-gray-200 pb-4">
          <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          <nav className="ml-auto flex gap-4 text-sm">
            <a href="/admin" className="text-gray-600 hover:text-gray-900">Dashboard</a>
            <a href="/admin/groups" className="text-gray-600 hover:text-gray-900">Groups</a>
            <a href="/admin/policies" className="text-gray-600 hover:text-gray-900">Policies</a>
          </nav>
        </div>
        {children}
      </main>
    </PageShell>
  );
}
