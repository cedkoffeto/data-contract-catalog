import { redirect } from "next/navigation";

import { auth } from "@/src/auth";
import { t } from "@/src/lib/i18n";
import { getUserPermissions } from "@/src/lib/rbac";
import { PageShell } from "@/src/components/layout/PageShell";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }

  const permissions = await getUserPermissions(session.user.name ?? session.user.email ?? "");

  if (!permissions.includes("admin")) {
    redirect("/");
  }

  return (
    <PageShell footerVersion="V0">
      <main className="mx-auto max-w-full pb-8 pt-6">
        <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-gray-200 pb-4 px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">{t("adminTitle")}</h1>
          <AdminNav />
        </div>
        {children}
      </main>
    </PageShell>
  );
}
