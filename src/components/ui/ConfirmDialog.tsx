"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/src/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  autoCloseMs?: number;
};

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel, autoCloseMs }: ConfirmDialogProps) {
  const [timeLeft, setTimeLeft] = useState(autoCloseMs ?? 0);
  const totalRef = useRef(autoCloseMs ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    setTimeLeft(autoCloseMs);
    totalRef.current = autoCloseMs;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 100;
        if (next <= 0) {
          clearInterval(intervalRef.current);
          setTimeout(onCancel, 0);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(intervalRef.current);
  }, [open, autoCloseMs, onCancel]);

  if (!open) return null;

  const progress = autoCloseMs ? (timeLeft / totalRef.current) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-[300px] rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {autoCloseMs && (
            <button
              onClick={onCancel}
              className="mt-0.5 shrink-0 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        {autoCloseMs && (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-400 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="outline" className="w-full sm:w-auto">
            {autoCloseMs ? `Cancel (${Math.ceil(timeLeft / 1000)}s)` : "Cancel"}
          </Button>
          <button
            onClick={onConfirm}
            className="w-full rounded-md px-4 py-2 text-sm font-bold text-white sm:w-auto"
            style={{ backgroundColor: "#dc2626" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
