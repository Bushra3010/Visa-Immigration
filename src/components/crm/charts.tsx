import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dependency-free charts (server-rendered SVG / CSS). */

export function BarList({ items, format = (n) => n.toLocaleString("en-IN"), empty = "No data for this period." }: {
  items: { label: ReactNode; value: number; color?: string }[]; format?: (n: number) => string; empty?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-ink-soft">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-ink">{format(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: item.color ?? "var(--color-brand-500)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Daily series as columns. Fills missing days with zero. */
export function ColumnChart({ data, height = 180, color = "var(--color-brand-500)", empty = "No leads in this period." }: {
  data: { label: string; value: number; title?: string }[]; height?: number; color?: string; empty?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!data.length || total === 0) return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = Math.ceil(data.length / 8);
  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[3px] transition-opacity group-hover:opacity-80" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, backgroundColor: color }} />
            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[11px] text-white group-hover:block">
              {d.title ?? d.label}: {d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[2px] text-[10px] text-muted">
        {data.map((d, i) => <span key={i} className="flex-1 truncate text-center">{i % step === 0 ? d.label : ""}</span>)}
      </div>
    </div>
  );
}

/** Revenue vs expenses per month. */
export function PairedColumns({ data, format, height = 200 }: {
  data: { label: string; a: number; b: number }[]; format: (n: number) => string; height?: number;
}) {
  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  if (data.every((d) => d.a === 0 && d.b === 0)) return <p className="py-10 text-center text-sm text-muted">No revenue or expenses recorded yet.</p>;
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-500" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-amber-400" />Expenses</span>
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full flex-1 items-end gap-[2px]">
            <div className="flex-1 rounded-t-[3px] bg-brand-500" style={{ height: `${(d.a / max) * 100}%`, minHeight: d.a ? 3 : 0 }} />
            <div className="flex-1 rounded-t-[3px] bg-amber-400" style={{ height: `${(d.b / max) * 100}%`, minHeight: d.b ? 3 : 0 }} />
            <span className="pointer-events-none absolute -top-12 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] leading-tight text-white group-hover:block">
              {d.label}<br />Rev {format(d.a)} · Exp {format(d.b)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[10px] text-muted">
        {data.map((d) => <span key={d.label} className="flex-1 truncate text-center">{d.label}</span>)}
      </div>
    </div>
  );
}

export function Donut({ value, label, size = 120, color = "var(--color-brand-500)", className }: { value: number; label: ReactNode; size?: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-canvas)" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-bold tabular-nums">{pct.toFixed(pct % 1 ? 1 : 0)}%</p>
        <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      </div>
    </div>
  );
}

/** Stacked horizontal bar of stage distribution. */
export function StageStrip({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((a, i) => a + i.value, 0);
  if (!total) return null;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-canvas">
        {items.filter((i) => i.value).map((i) => (
          <div key={i.label} title={`${i.label}: ${i.value}`} style={{ width: `${(i.value / total) * 100}%`, backgroundColor: i.color }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        {items.filter((i) => i.value).map((i) => (
          <li key={i.label} className="flex items-center gap-1.5 text-ink-soft">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: i.color }} />
            <span className="truncate">{i.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
