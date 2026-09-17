"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AppNavItem = { href: string; label: string; exact?: boolean };

export function AppNav({ items }: { items: AppNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="overflow-x-auto px-2 pb-2 lg:pb-24">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                  active ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-canvas",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
