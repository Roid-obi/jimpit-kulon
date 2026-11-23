"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", durationMs = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, message, type };

      setToasts((prev) => {
        // Keep at most 3 toasts on screen at once
        const updated = [...prev, newToast];
        return updated.slice(-3);
      });

      const timeout = setTimeout(() => {
        removeToast(id);
      }, durationMs);

      timeoutsRef.current.set(id, timeout);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Container Toast Global (Mobile Safe Area) */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center px-4 space-y-2"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 16px)",
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isInfo = toast.type === "info";
          const isSuccess = toast.type === "success";

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-lg border text-xs sm:text-sm font-semibold max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200 transition-all ${
                isError
                  ? "bg-rose-50 text-rose-900 border-rose-200 shadow-rose-500/10"
                  : isInfo
                    ? "bg-amber-50 text-amber-900 border-amber-200 shadow-amber-500/10"
                    : "bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-500/10"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isError ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                ) : isInfo ? (
                  <Info className="w-5 h-5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <span className="leading-snug break-words">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-black/5 active:scale-95 transition-all text-current opacity-60 hover:opacity-100 shrink-0"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus digunakan di dalam ToastProvider");
  }
  return context;
}
