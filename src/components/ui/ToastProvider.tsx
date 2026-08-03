"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Toast } from "./Toast";

type ToastItem = {
  id: number;
  message: string;
  type: "success" | "error";
};

type ToastCtx = {
  showToast: (message: string, type?: "success" | "error") => void;
};

const ToastCtx = createContext<ToastCtx>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </ToastCtx.Provider>
  );
}
