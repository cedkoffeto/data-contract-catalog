"use client";

import { useEffect } from "react";
import { useToast } from "@/src/components/ui/ToastProvider";

export function RateLimitWatcher() {
  const { showToast } = useToast();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 429) {
        showToast("Trop de requêtes. Réessayez dans quelques secondes.", "error");
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [showToast]);

  return null;
}
