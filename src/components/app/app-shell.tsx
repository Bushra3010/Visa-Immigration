import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth-actions/actions";
import type { Viewer } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { Logo } from "@/components/site/logo";
import { AppNav, type AppNavItem } from "./app-nav";

export function AppShell({ viewer, nav, title, children }: { viewer: Viewer; nav: AppNavItem[]; title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <Logo height={44} />
          <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{title}</span>
        </div>
        <AppNav items={nav} />
        <div className="hidden border-t border-line p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate text-sm font-medium">{viewer.fullName ?? viewer.email}</p>
          <p className="text-xs text-muted">{ROLE_LABELS[viewer.role]}</p>
          <form action={logout} className="mt-2">
            <button className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-danger"><LogOut className="size-4" /> Log out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
