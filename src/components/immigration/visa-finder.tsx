"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import { FileText, Handshake, ScanSearch, Search, ShieldCheck, Target, UserRound, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { OBJECTIVE_OPTIONS } from "@/lib/leads/options";
import { OBJECTIVE_TO_CATEGORY } from "@/lib/leads/schemas";
import { cn } from "@/lib/utils";

type Mode = "destination" | "type" | "purpose";
type Option = { value: string; label: string; hint?: string };

const MODES: { id: Mode; label: string; icon: LucideIcon; placeholder: string }[] = [
  { id: "destination", label: "By Destination", icon: MapPin, placeholder: "Search for a country or destination" },
  { id: "type", label: "By Visa Type", icon: FileText, placeholder: "Search for a visa type, e.g. Student Visa" },
  { id: "purpose", label: "By Purpose", icon: UserRound, placeholder: "What do you want to do? e.g. Study, Work" },
];

const QUICK_LINKS: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: ShieldCheck, label: "Eligibility Check", href: "/eligibility" },
  { icon: FileText, label: "Document Guidance", href: "/visa" },
  { icon: Handshake, label: "Application Support", href: "/consultation" },
  { icon: ScanSearch, label: "Visa Tracking", href: "/dashboard/applications" },
];

/** Hero search: pick a destination, visa type or purpose, then start the eligibility assessment (PRD §6.4). */
export function VisaFinder({ countries, categories }: { countries: Option[]; categories: Option[] }) {
  const router = useRouter();
  const listId = useId();
  const [mode, setMode] = useState<Mode>("destination");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const options: Option[] = mode === "destination" ? countries : mode === "type" ? categories : OBJECTIVE_OPTIONS;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const current = MODES.find((m) => m.id === mode)!;

  function choose(o: Option) {
    setSelected(o);
    setQuery(o.label);
    setOpen(false);
    setError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const pick = selected ?? (matches.length === 1 ? matches[0] : null);
    const params = new URLSearchParams();
    if (pick && mode === "destination") params.set("country", pick.value);
    if (pick && mode === "type") params.set("visa", pick.value);
    if (pick && mode === "purpose") params.set("visa", OBJECTIVE_TO_CATEGORY[pick.value] ?? pick.value);
    if (!pick && query.trim()) return setError("Choose an option from the list, or start the assessment without one.");
    router.push(`/eligibility${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="rounded-xl bg-white p-5 text-ink shadow-xl sm:p-6">
      <div role="tablist" aria-label="Find your visa" className="flex border-b border-line">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={mode === id}
            onClick={() => { setMode(id); setQuery(""); setSelected(null); setError(null); }}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap pb-3 text-[12.5px] sm:text-[14px]",
              mode === id ? "font-semibold text-brand-600" : "text-ink-soft hover:text-ink",
            )}
          >
            <Icon className="hidden size-[18px] sm:block" strokeWidth={1.8} />
            {label}
            {mode === id && <span aria-hidden className="absolute inset-x-4 -bottom-px h-0.5 bg-brand-600" />}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
          <input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={current.placeholder}
            placeholder={current.placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true); setActive(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && open && matches[active] && !selected) { e.preventDefault(); choose(matches[active]); }
            }}
            className="h-[46px] w-full rounded-md border border-line pl-11 pr-3 text-[14px] placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {open && matches.length > 0 && (
            <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-lg">
              {matches.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("cursor-pointer px-4 py-2 text-sm", i === active && "bg-brand-50")}
                >
                  <span className="font-medium">{o.label}</span>
                  {o.hint && <span className="ml-2 text-xs text-muted">{o.hint}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="flex h-[46px] items-center justify-center gap-2 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white hover:bg-brand-700">
          <Target className="size-4 sm:hidden" /> Check Eligibility
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}

      <ul className="mt-5 grid grid-cols-2 gap-y-3 border-t border-line pt-4 text-[12.5px] text-ink-soft sm:flex sm:justify-between sm:divide-x sm:divide-line">
        {QUICK_LINKS.map(({ icon: Icon, label, href }) => (
          <li key={label} className="sm:flex-auto sm:px-2.5 sm:first:pl-0 sm:last:pr-0">
            <Link href={href} className="flex items-center justify-center gap-1.5 whitespace-nowrap hover:text-brand-600">
              <Icon className="size-4" strokeWidth={1.8} /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
