"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function EditorNavLink() {
  const pathname = usePathname();
  const match = (pathname ?? "").match(/^\/contracts\/([^\/]+)/);
  const href = match ? `/editor?contract=${encodeURIComponent(match[1])}` : "/editor";

  return (
    <Link className="site-nav__cta" href={href}>
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M13.586 2.586a2 2 0 012.828 0l.828.828a2 2 0 010 2.828l-9.172 9.172a2 2 0 01-1.068.566l-3.11.518a1 1 0 01-1.112-1.112l.518-3.11a2 2 0 01.566-1.068l9.172-9.172zM15.414 4.414a.5.5 0 00-.707 0l-1.06 1.06 1.768 1.768 1.06-1.06a.5.5 0 000-.707l-.828-.828z" />
      </svg>
      Editor
    </Link>
  );
}
