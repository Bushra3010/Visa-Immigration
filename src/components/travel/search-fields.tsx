"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, Minus, Plus } from "lucide-react";
import type { Place } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

/* Large "field box" building blocks used by the homepage search widget. */

export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

export function FieldBox({ label, chevron, onClick, children, className, expanded, compact, trailing }: {
  label: string; chevron?: boolean; onClick?: () => void; children: ReactNode; className?: string; expanded?: boolean;
  /** Mobile style: bordered rounded box with an optional trailing icon. */
  compact?: boolean; trailing?: ReactNode;
}) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className={cn("flex h-full w-full items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-3 text-left", className)}
      >
        <span className="flex min-w-0 flex-1 flex-col items-start">
          <span className="text-[12.5px] text-ink-soft">{label}</span>
          {children}
        </span>
        {trailing}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn("flex h-full w-full flex-col items-start px-4 py-4 text-left transition-colors hover:bg-accent-50/60 sm:px-5", className)}
    >
      <span className="flex items-center gap-1.5 text-[14px] text-ink-soft">
        {label}
        {chevron && <ChevronDown className="size-4 text-accent-500" strokeWidth={2.2} />}
      </span>
      {children}
    </button>
  );
}

export function Popover({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) {
  if (!open) return null;
  return <div className={cn("absolute left-0 top-full z-40 mt-2 rounded-xl border border-line bg-white p-3 shadow-xl", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ Place */

export function PlaceField({ label, name, type, value, onChange, className, compact, align = "left" }: {
  label: string; name: string; type: "airport" | "hotel"; value: Place | null; onChange: (p: Place) => void; className?: string;
  compact?: boolean; align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Place[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`/api/places?type=${type}&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => { setOptions(d.places ?? []); setActive(0); setLoading(false); })
        .catch(() => {});
    }, 120);
    return () => { clearTimeout(t); controller.abort(); };
  }, [open, query, type]);

  const choose = (p: Place) => { onChange(p); setOpen(false); setQuery(""); };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <input type="hidden" name={name} value={value?.code ?? ""} />
      {compact ? (
        <FieldBox compact label={label} onClick={() => setOpen(true)} expanded={open} className="min-h-[78px]">
          {value ? (
            <>
              <span className="mt-0.5 max-w-full truncate text-[17px] font-semibold leading-tight text-ink">{value.city}</span>
              <span className="mt-0.5 max-w-full truncate text-[12.5px] text-ink-soft">{type === "airport" ? `${value.code}, ${value.country}` : value.country}</span>
            </>
          ) : (
            <span className="mt-1 text-[15px] font-medium text-muted">Select {type === "airport" ? "city" : "destination"}</span>
          )}
        </FieldBox>
      ) : (
      <FieldBox label={label} onClick={() => setOpen(true)} expanded={open}>
        {value ? (
          <>
            <span className="mt-1.5 max-w-full truncate text-[26px] font-bold leading-tight text-ink">{value.city}</span>
            <span className="mt-1 max-w-full truncate text-[14px] text-ink-soft">
              {type === "airport" ? `${value.code}, ${value.name}` : value.country}
            </span>
          </>
        ) : (
          <span className="mt-2 text-[20px] font-semibold text-muted">Select {type === "airport" ? "city" : "destination"}</span>
        )}
      </FieldBox>
      )}
      <Popover open={open} className={cn("w-[340px] max-w-[calc(100vw-32px)]", align === "right" && "left-auto right-0")}>
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-label={`${label} search`}
          placeholder={type === "airport" ? "Search city or airport" : "Search city"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter" && options[active]) { e.preventDefault(); choose(options[active]); }
          }}
          className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-accent-500 focus:outline-none"
        />
        <ul id={listId} role="listbox" className="mt-2 max-h-72 overflow-auto">
          {options.map((p, i) => (
            <li
              key={p.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2", i === active && "bg-accent-50")}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{p.city}{type === "airport" && `, ${p.country}`}</span>
                <span className="block truncate text-xs text-muted">{type === "airport" ? p.name : p.country}</span>
              </span>
              {type === "airport" && <span className="text-xs font-semibold text-ink-soft">{p.code}</span>}
            </li>
          ))}
          {options.length === 0 && <li className="px-3 py-2 text-sm text-muted">{loading ? "Searching…" : "No matches"}</li>}
        </ul>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ Date */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { day: d, month: `${MONTHS[m - 1]}'${String(y).slice(2)}`, weekday: DAYS[date.getDay()] };
}

export function DateField({ label, name, value, min, onChange, placeholder, onEmptyClick, className, compact }: {
  label: string; name: string; value: string | null; min: string; onChange: (v: string) => void;
  placeholder?: string; onEmptyClick?: () => void; className?: string; compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const open = () => {
    onEmptyClick?.();
    const el = inputRef.current;
    if (!el) return;
    // Defer so a just-enabled input is ready before opening the native picker.
    requestAnimationFrame(() => {
      try {
        el.showPicker();
      } catch {
        el.focus();
      }
    });
  };
  const p = value ? parts(value) : null;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="date"
        name={value ? name : undefined}
        value={value ?? ""}
        min={min}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 h-0 w-0 opacity-0"
      />
      {compact ? (
        <FieldBox compact label={label} onClick={open} className="min-h-[64px]" trailing={<CalendarDays className="size-5 shrink-0 text-ink-soft" strokeWidth={1.6} />}>
          {p ? (
            <span className="mt-0.5 text-[16px] font-semibold text-ink">{p.day} {p.month.replace("'", " '")}</span>
          ) : (
            <span className="mt-0.5 text-[13px] text-muted">{placeholder ?? "Add date"}</span>
          )}
        </FieldBox>
      ) : (
      <FieldBox label={label} chevron onClick={open}>
        {p ? (
          <>
            <span className="mt-1.5 flex items-baseline gap-1.5 text-ink">
              <span className="text-[26px] font-bold leading-tight">{p.day}</span>
              <span className="text-[18px] font-medium">{p.month}</span>
            </span>
            <span className="mt-1 text-[14px] text-ink-soft">{p.weekday}</span>
          </>
        ) : (
          <span className="mt-2 max-w-[150px] text-[12px] font-medium leading-snug text-muted">{placeholder}</span>
        )}
      </FieldBox>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Counters */

export function Counter({ label, hint, value, min, max, onChange }: {
  label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-8 place-items-center rounded-full border border-line text-accent-500 disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center font-semibold tabular-nums">{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-8 place-items-center rounded-full border border-line text-accent-500 disabled:opacity-40">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function PopoverField({ label, children, display, sub, className, popoverClassName, compact, trailing }: {
  label: string; children: ReactNode; display: ReactNode; sub?: ReactNode; className?: string; popoverClassName?: string;
  compact?: boolean; trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  return (
    <div ref={ref} className={cn("relative", className)}>
      {compact ? (
        <FieldBox compact label={label} onClick={() => setOpen(!open)} expanded={open} className="min-h-[64px]" trailing={trailing}>
          <span className="mt-0.5 max-w-full text-[14.5px] font-medium leading-snug text-ink">{display}</span>
        </FieldBox>
      ) : (
        <FieldBox label={label} chevron onClick={() => setOpen(!open)} expanded={open}>
          <span className="mt-1.5 text-[22px] font-bold leading-tight text-ink">{display}</span>
          {sub && <span className="mt-1 text-[14px] text-ink-soft">{sub}</span>}
        </FieldBox>
      )}
      <Popover open={open} className={cn("w-[300px] max-w-[calc(100vw-32px)]", popoverClassName)}>
        {children}
        <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full rounded-lg bg-accent-500 py-2 text-sm font-semibold text-white">Done</button>
      </Popover>
    </div>
  );
}
