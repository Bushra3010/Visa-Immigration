"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; message: string };
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export const useToast = () => useContext(ToastContext);

const FLASH_COOKIE = "crm_flash";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pathname = usePathname();

  const push = useCallback((message: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);

  // Flash messages set by server actions before a redirect.
  useEffect(() => {
    const match = document.cookie.split("; ").find((c) => c.startsWith(`${FLASH_COOKIE}=`));
    if (!match) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/crm`;
    try {
      const b64 = match.slice(FLASH_COOKIE.length + 1).replace(/-/g, "+").replace(/_/g, "/");
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const { message, tone } = JSON.parse(new TextDecoder().decode(raw));
      if (message) setTimeout(() => push(String(message), tone === "error" ? "error" : "success"), 0);
    } catch {
      // ignore malformed cookie
    }
  }, [pathname, push]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-auto sm:left-auto sm:right-4 sm:top-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg shadow-ink/10",
              t.tone === "success" && "border-green-200",
              t.tone === "error" && "border-red-200",
              t.tone === "info" && "border-line",
            )}
          >
            {t.tone === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
            {t.tone === "error" && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />}
            {t.tone === "info" && <Info className="mt-0.5 size-4 shrink-0 text-accent-500" />}
            <p className="flex-1 text-ink">{t.message}</p>
            <button type="button" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))} className="text-muted hover:text-ink" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
