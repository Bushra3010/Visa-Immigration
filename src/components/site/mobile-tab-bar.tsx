"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", match: (p) => p === "/" },
  { href: "/countries", label: "Explore", match: (p) => p.startsWith("/countries") || p.startsWith("/visa") || p === "/immigration" },
  { href: "/dashboard/bookings", label: "Bookings", match: (p) => p.startsWith("/dashboard/bookings") },
  { href: "/dashboard/profile", label: "Profile", match: (p) => p.startsWith("/dashboard/profile") || p === "/login" },
];

/** Bottom navigation for phones. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <>
      <div aria-hidden className="h-[60px] md:hidden" />
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid h-[60px] grid-cols-4">
          {TABS.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex h-full flex-col items-center justify-center gap-2 text-[10px]", active ? "font-bold text-pine-800" : "text-ink-soft")}
                >
                  <span aria-hidden className={cn("size-[5px] rounded-full", active ? "bg-pine-800" : "bg-pine-600/80")} />
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
