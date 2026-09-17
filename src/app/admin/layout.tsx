import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireViewer } from "@/lib/auth";
import { canAccess, type AdminSection } from "@/lib/roles";

const NAV: { href: string; label: string; section: AdminSection; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", section: "dashboard", exact: true },
  { href: "/admin/leads", label: "Leads", section: "leads" },
  { href: "/admin/applications", label: "Applications", section: "applications" },
  { href: "/admin/documents", label: "Document review", section: "documents" },
  { href: "/admin/consultations", label: "Consultations", section: "consultations" },
  { href: "/admin/travel", label: "Travel bookings", section: "travel" },
  { href: "/admin/payments", label: "Payments", section: "payments" },
  { href: "/admin/users", label: "Users", section: "users" },
  { href: "/admin/counsellors", label: "Counsellors", section: "counsellors" },
  { href: "/admin/markup", label: "Pricing & markup", section: "markup" },
  { href: "/admin/suppliers", label: "API management", section: "suppliers" },
  { href: "/admin/cms", label: "Content (CMS)", section: "cms" },
  { href: "/admin/reports", label: "Reports", section: "reports" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireViewer("/admin");
  if (viewer.role === "customer") redirect("/dashboard");
  const nav = NAV.filter((n) => canAccess(viewer.role, n.section));
  return <AppShell viewer={viewer} nav={nav} title="Admin">{children}</AppShell>;
}
