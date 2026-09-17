"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, List, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMe } from "./account-actions";
import type { NavGroup } from "./nav-config";

const BREAKPOINTS = {
  xl: { nav: "hidden xl:block", toggle: "xl:hidden", gap: "gap-4 2xl:gap-8", item: "px-3 text-[15px]" },
  lg: { nav: "hidden lg:block", toggle: "lg:hidden", gap: "gap-0 xl:gap-3", item: "px-2 text-[13.5px] xl:px-3 xl:text-[15px]" },
} as const;

export function MainNav({ groups, breakpoint = "xl", mobileTop = 72 }: { groups: NavGroup[]; breakpoint?: keyof typeof BREAKPOINTS; mobileTop?: number }) {
  const bp = BREAKPOINTS[breakpoint];
  const pathname = usePathname();
  const me = useMe();
  const accountHref = me?.signedIn ? me.accountHref : null;
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on navigation
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <nav ref={navRef} aria-label="Primary" className={bp.nav}>
        <ul className={cn("flex items-center", bp.gap)}>
          {groups.map((g) =>
            g.items ? (
              <li key={g.label} className="relative">
                <button
                  type="button"
                  aria-expanded={open === g.label}
                  onClick={() => setOpen(open === g.label ? null : g.label)}
                  className={cn("flex items-center gap-1 whitespace-nowrap rounded-md py-2 font-medium text-ink hover:text-brand-600", bp.item)}
                >
                  {g.label}
                  <ChevronDown className={cn("size-4 transition-transform", open === g.label && "rotate-180")} />
                </button>
                {open === g.label && (
                  <ul className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-line bg-white p-2 shadow-lg">
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="block rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-brand-50 hover:text-brand-700">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={g.label}>
                <Link
                  href={g.href!}
                  className={cn(
                    "whitespace-nowrap rounded-md py-2 font-medium text-ink hover:text-brand-600",
                    bp.item,
                    pathname === g.href && "text-brand-600",
                  )}
                >
                  {g.label}
                </Link>
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className={cn("ml-auto flex items-center gap-5", bp.toggle)}>
        <Link
          href="/dashboard/notifications"
          aria-label={me?.signedIn && me.unreadNotifications > 0 ? `Notifications, ${me.unreadNotifications} unread` : "Notifications"}
          className="relative p-1 text-ink"
        >
          <Bell className="size-7" strokeWidth={1.6} />
          {me?.signedIn && me.unreadNotifications > 0 && (
            <span aria-hidden className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-brand-600 ring-2 ring-white" />
          )}
        </Link>
        <button
          type="button"
          className="grid size-12 place-items-center rounded-full bg-brand-50 text-ink"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-6" strokeWidth={1.8} /> : <List className="size-6" strokeWidth={1.8} />}
        </button>
      </div>

      {mobileOpen && (
        <div className={cn("fixed inset-x-0 bottom-0 z-40 overflow-y-auto border-t border-line bg-white px-4 pb-8", bp.toggle)} style={{ top: mobileTop }}>
          {groups.map((g) => (
            <div key={g.label} className="border-b border-line py-3">
              {g.items ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</p>
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {g.items.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="block rounded-md py-1.5 text-sm text-ink-soft">{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <Link href={g.href!} className="block text-sm font-medium text-ink">{g.label}</Link>
              )}
            </div>
          ))}
          <div className="mt-4 grid gap-2">
            <Link href="/eligibility" className="rounded-lg bg-brand-600 py-3 text-center font-medium text-white">Check eligibility</Link>
            <Link href={accountHref ?? "/login"} className="rounded-lg py-3 text-center font-medium text-ink ring-1 ring-line">
              {accountHref ? "My account" : "Login / Register"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
