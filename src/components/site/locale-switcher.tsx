"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

/**
 * Currency / language selector from the design. Only INR and English are
 * supported today; the menu makes that explicit rather than offering options
 * that don't work.
 */
export function LocaleSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Currency and language"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 text-[15px] font-medium text-ink"
      >
        <Globe className="size-5 text-ink-soft" strokeWidth={1.6} />
        INR
        <span aria-hidden className="h-4 w-px bg-line" />
        English
        <ChevronDown className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-52 rounded-xl border border-line bg-white p-3 text-sm shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Currency</p>
          <p className="mt-1 flex items-center justify-between py-1 font-medium">₹ INR <Check className="size-4 text-brand-600" /></p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Language</p>
          <p className="mt-1 flex items-center justify-between py-1 font-medium">English <Check className="size-4 text-brand-600" /></p>
          <p className="mt-2 text-xs text-muted">More currencies and languages coming soon.</p>
        </div>
      )}
    </div>
  );
}
