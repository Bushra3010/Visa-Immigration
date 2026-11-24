import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Inbox } from "lucide-react";
import { initials, onColor } from "@/lib/crm/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 print:mb-3">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700 print:hidden">
          <ChevronLeft className="size-4" />{back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, description, action, children, className, bodyClassName }: {
  title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white shadow-xs", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div>
            {title && <h2 className="font-semibold text-ink">{title}</h2>}
            {description && <p className="text-xs text-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

const tones = {
  brand: "bg-brand-50 text-brand-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-700",
  green: "bg-green-50 text-green-700",
  orange: "bg-orange-50 text-orange-700",
  teal: "bg-teal-50 text-teal-700",
} as const;
export type Tone = keyof typeof tones;

export function StatCard({ label, value, icon, tone = "brand", hint, href }: { label: string; value: ReactNode; icon?: ReactNode; tone?: Tone; hint?: ReactNode; href?: string }) {
  const body = (
    <div className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs transition-shadow hover:shadow-md">
      {icon && <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&>svg]:size-5", tones[tone])}>{icon}</span>}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block focus-visible:rounded-2xl">{body}</Link> : body;
}

export function ColorBadge({ color, children, className }: { color: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium", className)} style={{ backgroundColor: color, color: onColor(color) }}>
      {children}
    </span>
  );
}

/** Soft badge tinted by a hex colour (for stages / statuses). */
export function TintBadge({ color, children, className }: { color?: string | null; children: ReactNode; className?: string }) {
  const c = color ?? "#64748b";
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", className)}
      style={{ backgroundColor: `${c}14`, color: c, ["--tw-ring-color" as string]: `${c}40` }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: c }} />
      <span className="truncate">{children}</span>
    </span>
  );
}

const pill = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-green-50 text-green-700 ring-green-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
} as const;
export type PillTone = keyof typeof pill;

export function Pill({ tone = "neutral", children, className }: { tone?: PillTone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", pill[tone], className)}>{children}</span>;
}

const STATUS_TONES: Record<string, PillTone> = {
  hot: "danger", warm: "warning", cold: "info",
  pending: "warning", completed: "success", missed: "danger", cancelled: "neutral", overdue: "danger",
  verified: "success", rejected: "danger", approved: "success",
  unpaid: "danger", partial: "warning", paid: "success", overpaid: "info",
  active: "success", inactive: "neutral",
  advance: "brand", installment: "info", final: "success", other: "neutral",
};
export function StatusPill({ status, label, className }: { status: string; label?: string; className?: string }) {
  return <Pill tone={STATUS_TONES[status] ?? "neutral"} className={className}>{label ?? status.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</Pill>;
}

export function Avatar({ name, src, size = "md" }: { name: string | null | undefined; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-16 text-lg" }[size];
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", s)} />;
  }
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 ring-2 ring-white", s)}>{initials(name)}</span>;
}

export function Empty({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-canvas text-muted">{icon ?? <Inbox className="size-6" />}</span>
      <p className="mt-3 font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
export function Table({ children, className, minWidth = 760 }: { children: ReactNode; className?: string; minWidth?: number }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-line bg-white shadow-xs", className)}>
      <table className="w-full text-left text-sm" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-canvas/70 text-[11px] uppercase tracking-wider text-muted"><tr>{children}</tr></thead>;
}

export function Th({ children, className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("whitespace-nowrap px-4 py-3 font-semibold", className)} {...props}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-canvas/60", className)}>{children}</tr>;
}

export function Td({ children, className, colSpan, title }: { children?: ReactNode; className?: string; colSpan?: number; title?: string }) {
  return <td colSpan={colSpan} title={title} className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

type Params = Record<string, string | string[] | undefined>;
export function hrefWith(base: string, params: Params, patch: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v !== "") sp.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") sp.delete(k);
    else sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}

export function SortTh({ label, column, base, params, className }: { label: string; column: string; base: string; params: Params; className?: string }) {
  const current = typeof params.sort === "string" ? params.sort : "";
  const dir = typeof params.dir === "string" ? params.dir : "desc";
  const active = current === column;
  const nextDir = active && dir === "desc" ? "asc" : "desc";
  return (
    <Th className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={hrefWith(base, params, { sort: column, dir: nextDir, page: null })} className="inline-flex items-center gap-1 hover:text-ink">
        {label}
        {active ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ChevronsUpDown className="size-3 opacity-40" />}
      </Link>
    </Th>
  );
}

export function Pagination({ page, pageSize, total, base, params }: { page: number; pageSize: number; total: number; base: string; params: Params }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm print:hidden" aria-label="Pagination">
      <p className="text-muted">Showing <span className="font-medium text-ink">{from}–{to}</span> of <span className="font-medium text-ink">{total.toLocaleString("en-IN")}</span></p>
      <div className="flex items-center gap-1">
        {page > 1
          ? <Link href={hrefWith(base, params, { page: page - 1 })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 hover:bg-canvas"><ChevronLeft className="size-4" />Prev</Link>
          : <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-muted opacity-50"><ChevronLeft className="size-4" />Prev</span>}
        <span className="px-2 text-muted">{page} / {pages}</span>
        {page < pages
          ? <Link href={hrefWith(base, params, { page: page + 1 })} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 hover:bg-canvas">Next<ChevronRight className="size-4" /></Link>
          : <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-muted opacity-50">Next<ChevronRight className="size-4" /></span>}
      </div>
    </nav>
  );
}

export function Tabs({ tabs, active, base, params, param = "tab" }: { tabs: { key: string; label: string; count?: number }[]; active: string; base: string; params: Params; param?: string }) {
  return (
    <div className="mb-4 overflow-x-auto border-b border-line print:hidden">
      <nav className="flex min-w-max gap-1" aria-label="Tabs">
        {tabs.map((t) => (
          <Link key={t.key} href={hrefWith(base, params, { [param]: t.key, page: null })} aria-current={active === t.key ? "page" : undefined}
            className={cn("-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium",
              active === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-muted hover:text-ink")}>
            {t.label}
            {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px]", active === t.key ? "bg-brand-50 text-brand-700" : "bg-canvas text-muted")}>{t.count}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function KV({ items, cols = 3 }: { items: { label: string; value: ReactNode }[]; cols?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", grid)}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{i.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{i.value === null || i.value === undefined || i.value === "" ? <span className="text-muted">—</span> : i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FilterBar({ children, action }: { children: ReactNode; action: string }) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-xs print:hidden">
      {children}
    </form>
  );
}

export const filterControl = "h-9 rounded-lg border border-line bg-white px-3 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
