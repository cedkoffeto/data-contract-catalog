"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/src/components/ui/ToastProvider";

export function RateLimitWatcher() {
  const { showToast } = useToast();
  const lastToastRef = useRef(0);

  const toastOnce = useCallback(() => {
    const now = Date.now();
    if (now - lastToastRef.current > 10000) {
      lastToastRef.current = now;
      showToast("Trop de requêtes. Réessayez dans quelques secondes.", "error");
    }
  }, [showToast]);

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 429) {
        console.warn(`[rate-limit] 429 on ${String(args[0])}`);
        toastOnce();
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [toastOnce]);

  return null;
}
