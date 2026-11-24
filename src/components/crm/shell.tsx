import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, LogOut, Plus, Search, UserRound } from "lucide-react";
import logo from "../../../public/Images/logo-cropped.png";
import { buttonClass } from "@/components/ui/button";
import { can, type CrmViewer } from "@/lib/crm/auth";
import { crmLogout } from "@/lib/crm/actions/auth";
import { Avatar } from "./blocks";
import { MobileNav, Sidebar, type NavGroup } from "./nav";

export function navFor(viewer: CrmViewer, counts: { followUps: number }): NavGroup[] {
  const groups: NavGroup[] = [
    { label: "Overview", items: [{ href: "/crm", label: "Dashboard", icon: "dashboard", exact: true }] },
    {
      label: "Sales",
      items: [
        can(viewer, "leads.view") && { href: "/crm/leads", label: "Leads", icon: "leads" },
        can(viewer, "pipeline.view") && can(viewer, "leads.view") && { href: "/crm/pipeline", label: "Pipeline", icon: "pipeline" },
        { href: "/crm/follow-ups", label: "Follow-ups & Tasks", icon: "followups", badge: counts.followUps },
      ].filter(Boolean) as NavGroup["items"],
    },
    {
      label: "Clients",
      items: [
        can(viewer, "customers.view") && { href: "/crm/customers", label: "Customers", icon: "customers" },
        can(viewer, "applications.view") && { href: "/crm/applications", label: "Visa Applications", icon: "applications" },
        can(viewer, "documents.view") && { href: "/crm/documents", label: "Documents", icon: "documents" },
      ].filter(Boolean) as NavGroup["items"],
    },
    {
      label: "Finance",
      items: [
        can(viewer, "payments.view") && { href: "/crm/payments", label: "Payments", icon: "payments" },
        can(viewer, "expenses.view") && { href: "/crm/expenses", label: "Expenses", icon: "expenses" },
        can(viewer, "reports.view") && { href: "/crm/reports", label: "Reports", icon: "reports" },
      ].filter(Boolean) as NavGroup["items"],
    },
    {
      label: "Administration",
      items: [
        can(viewer, "users.view") && { href: "/crm/users", label: "Users", icon: "users" },
        (viewer.isSuper || can(viewer, "users.view")) && { href: "/crm/roles", label: "Roles & Permissions", icon: "roles" },
        can(viewer, "settings.view") && { href: "/crm/settings", label: "Settings", icon: "settings" },
        can(viewer, "audit.view") && { href: "/crm/audit", label: "Audit Log", icon: "audit" },
      ].filter(Boolean) as NavGroup["items"],
    },
  ];
  return groups.filter((g) => g.items.length);
}

function Brand() {
  return (
    <Link href="/crm" className="flex items-center gap-2.5">
      <span className="rounded-lg bg-white px-2 py-1"><Image src={logo} alt="New Visa" height={30} style={{ width: "auto", height: 30 }} /></span>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">CRM</span>
    </Link>
  );
}

function UserFooter({ viewer }: { viewer: CrmViewer }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
      <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="sm" />
      <Link href="/crm/profile" className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{viewer.fullName}</p>
        <p className="truncate text-[11px] text-white/50">{viewer.roleName}</p>
      </Link>
      <form action={crmLogout}>
        <button className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Log out" title="Log out"><LogOut className="size-4" /></button>
      </form>
    </div>
  );
}

export function CrmShell({ viewer, counts, children }: { viewer: CrmViewer; counts: { followUps: number }; children: ReactNode }) {
  const groups = navFor(viewer, counts);
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar groups={groups} brand={<Brand />} footer={<UserFooter viewer={viewer} />} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <MobileNav groups={groups} brand={<Brand />} footer={<UserFooter viewer={viewer} />} />
          {can(viewer, "leads.view") ? (
            <form action="/crm/leads" className="relative max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input name="q" type="search" placeholder="Search leads by name, phone, email or ID…" aria-label="Search leads"
                className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </form>
          ) : <div className="flex-1" />}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {can(viewer, "leads.create") && (
              <Link href="/crm/leads/new" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}><Plus className="size-4" />New lead</Link>
            )}
            <Link href="/crm/follow-ups?view=today" className="relative grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-canvas" aria-label={`${counts.followUps} follow-ups due`}>
              <Bell className="size-5" />
              {counts.followUps > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{counts.followUps > 99 ? "99+" : counts.followUps}</span>}
            </Link>
            <Link href="/crm/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-canvas" aria-label="My profile">
              {viewer.avatarUrl ? <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="sm" /> : <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700"><UserRound className="size-4" /></span>}
              <span className="hidden text-left text-sm leading-tight md:block">
                <span className="block max-w-36 truncate font-semibold">{viewer.fullName}</span>
                <span className="block text-[11px] text-muted">{viewer.roleName}</span>
              </span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
