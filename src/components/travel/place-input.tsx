"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  type: "airport" | "hotel";
  defaultValue?: Place | null;
  placeholder?: string;
  required?: boolean;
  onSelect?: (place: Place | null) => void;
};

/** Accessible combobox that resolves free text to a supplier place code. */
export function PlaceInput({ label, name, type, defaultValue, placeholder, required, onSelect }: Props) {
  const id = useId();
  const [query, setQuery] = useState(defaultValue ? display(defaultValue, type) : "");
  const [selected, setSelected] = useState<Place | null>(defaultValue ?? null);
  const [options, setOptions] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/places?type=${type}&q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          setOptions(d.places ?? []);
          setActive(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, type]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function choose(place: Place) {
    setSelected(place);
    setQuery(display(place, type));
    setOpen(false);
    onSelect?.(place);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          onSelect?.(null);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, options.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && open && options[active]) { e.preventDefault(); choose(options[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      <input type="hidden" name={name} value={selected?.code ?? ""} />
      {open && options.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full min-w-64 overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {options.map((p, i) => (
            <li
              key={p.code}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setActive(i)}
              className={cn("cursor-pointer px-3 py-2 text-sm", i === active && "bg-brand-50")}
            >
              <span className="font-medium text-ink">{p.city}</span>
              {type === "airport" && <span className="ml-2 rounded bg-canvas px-1.5 text-xs font-semibold text-ink-soft">{p.code}</span>}
              <span className="block text-xs text-muted">{type === "airport" ? `${p.name}, ${p.country}` : p.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function display(p: Place, type: "airport" | "hotel") {
  return type === "airport" ? `${p.city} (${p.code})` : `${p.city}, ${p.country}`;
}
