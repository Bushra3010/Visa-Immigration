"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Headset, House, ScrollText, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: House, match: (p) => p === "/" },
  { href: "/countries", label: "Explore", icon: Compass, match: (p) => p.startsWith("/countries") || p.startsWith("/visa") || p === "/immigration" },
  { href: "/dashboard/applications", label: "Applications", icon: ScrollText, match: (p) => p.startsWith("/dashboard/applications") },
  { href: "/contact", label: "Support", icon: Headset, match: (p) => p === "/contact" || p === "/faqs" || p === "/consultation" },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound, match: (p) => p.startsWith("/dashboard/profile") || p === "/login" },
];

/** Bottom navigation for phones. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <>
      <div aria-hidden className="h-[76px] md:hidden" />
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,27,45,0.06)] md:hidden">
        <ul className="grid h-[76px] grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex h-full flex-col items-center justify-center gap-1 text-[12px]", active ? "font-semibold text-brand-600" : "text-ink-soft")}>
                  <Icon className={cn("size-6", active && "fill-brand-600 text-brand-600")} strokeWidth={active ? 1.8 : 1.5} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
