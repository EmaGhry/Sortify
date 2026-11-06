"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LanguageProvider } from "@/lib/i18n";
import { ToastStack, type ToastInput } from "./toast";

interface ToastContextValue {
  toast: (t: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInput[]>([]);

  const toast = useCallback((t: ToastInput) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.durationMs ?? 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <LanguageProvider>
        {children}
        <ToastStack toasts={toasts} />
      </LanguageProvider>
    </ToastContext.Provider>
  );
}
