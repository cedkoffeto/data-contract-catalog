"use client";

import { useT } from "@/src/lib/use-i18n";

export function GoBackButton({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className={className ?? "text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-gray-700 hover:decoration-gray-500"}
    >
      {t("previousPage")}
    </button>
  );
}
