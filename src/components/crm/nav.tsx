"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Briefcase, CalendarClock, ClipboardList, FileCheck2, FileText, KanbanSquare, LayoutDashboard,
  Menu, Receipt, ScrollText, Settings, ShieldCheck, UserCog, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard, leads: Users, pipeline: KanbanSquare, followups: CalendarClock, customers: Briefcase,
  applications: ClipboardList, documents: FileCheck2, payments: Wallet, expenses: Receipt, reports: BarChart3,
  users: UserCog, roles: ShieldCheck, settings: Settings, audit: ScrollText, file: FileText,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number };
export type NavGroup = { label: string; items: NavItem[] };

function NavList({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="CRM" className="space-y-5 px-3 py-4">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_var(--color-brand-200)]" : "text-white/70 hover:bg-white/8 hover:text-white")}>
                    <Icon className={cn("size-[18px] shrink-0", active ? "text-brand-200" : "text-white/50 group-hover:text-white/80")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {!!item.badge && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white">{item.badge > 99 ? "99+" : item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ groups, brand, footer }: { groups: NavGroup[]; brand: ReactNode; footer: ReactNode }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-pine-900 text-white lg:sticky lg:top-0 lg:flex lg:h-screen print:hidden">
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">{brand}</div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]"><NavList groups={groups} /></div>
      <div className="shrink-0 border-t border-white/10 p-3">{footer}</div>
    </aside>
  );
}

export function MobileNav({ groups, brand, footer }: { groups: NavGroup[]; brand: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  // Close the drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-canvas lg:hidden" aria-label="Open menu">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-pine-900 text-white shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavList groups={groups} onNavigate={() => setOpen(false)} /></div>
            <div className="border-t border-white/10 p-3">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
