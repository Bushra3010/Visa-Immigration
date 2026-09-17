import { AppShell } from "@/components/app/app-shell";
import { requireViewer } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/applications", label: "My Applications" },
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/consultations", label: "Consultations" },
  { href: "/dashboard/bookings", label: "Flight & Hotel Bookings" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/profile", label: "Profile" },
];

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const viewer = await requireViewer("/dashboard");
  return <AppShell viewer={viewer} nav={NAV} title="My account">{children}</AppShell>;
}
