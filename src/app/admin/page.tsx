import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatCard } from "@/components/app/table";
import { Card } from "@/components/ui/primitives";
import { requireSection } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso, formatDate, formatMoney, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin dashboard" };

export default async function AdminDashboard() {
  const viewer = await requireSection("dashboard");
  const supabase = await createClient();
  const since = daysAgoIso(7);
  const count = (q: PromiseLike<{ count: number | null }>) => Promise.resolve(q).then((r) => r.count ?? 0);

  const role = viewer.role;
  const showImmigration = canAccess(role, "leads") || canAccess(role, "documents");
  const showTravel = canAccess(role, "travel") || canAccess(role, "payments");
  const showFinance = canAccess(role, "payments");

  // RLS scopes every count to what this role can see.
  const [totalLeads, newLeads, activeApps, pendingDocs, consultations, approvedApps, flights, hotels, revenueRows, pendingPayments, activity] = await Promise.all([
    count(supabase.from("leads").select("id", { count: "exact", head: true })),
    count(supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since)),
    count(supabase.from("applications").select("id", { count: "exact", head: true }).not("status", "in", "(approved,rejected,withdrawn)")),
    count(supabase.from("documents").select("id", { count: "exact", head: true }).in("status", ["uploaded", "under_review"])),
    count(supabase.from("consultations").select("id", { count: "exact", head: true }).in("status", ["requested", "confirmed"])),
    count(supabase.from("applications").select("id", { count: "exact", head: true })),
    count(supabase.from("flight_bookings").select("id", { count: "exact", head: true })),
    count(supabase.from("hotel_bookings").select("id", { count: "exact", head: true })),
    showFinance ? supabase.from("payments").select("amount").eq("status", "succeeded") : Promise.resolve({ data: [] as { amount: number }[] }),
    count(supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending")),
    supabase.from("lead_activities").select("id, kind, body, created_at, leads(id, full_name)").order("created_at", { ascending: false }).limit(8),
  ]);
  const revenue = (revenueRows.data ?? []).reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageHeader title="Dashboard" description={`Signed in as ${viewer.fullName ?? viewer.email}`} />
      {showImmigration && (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Immigration</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <StatCard label="Total leads" value={totalLeads} />
            <StatCard label="New leads (7 days)" value={newLeads} />
            <StatCard label="Active applications" value={activeApps} />
            <StatCard label="Visa applications" value={approvedApps} />
            <StatCard label="Documents to review" value={pendingDocs} hint={canAccess(role, "documents") ? <Link href="/admin/documents" className="text-brand-600">Review →</Link> : undefined} />
            <StatCard label="Open consultations" value={consultations} />
          </div>
        </>
      )}
      {showTravel && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Travel & finance</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Flight bookings" value={flights} />
            <StatCard label="Hotel bookings" value={hotels} />
            {showFinance && <StatCard label="Revenue collected" value={formatMoney(revenue)} />}
            <StatCard label="Pending payments" value={pendingPayments} />
          </div>
        </>
      )}
      {showImmigration && (
        <section className="mt-8">
          <h2 className="mb-3 font-semibold">Recent activity</h2>
          <Card className="divide-y divide-line">
            {(activity.data ?? []).map((a) => {
              const lead = a.leads as unknown as { id: string; full_name: string } | null;
              return (
                <div key={a.id} className="flex justify-between gap-4 p-3 text-sm">
                  <p>{lead && <Link href={`/admin/leads/${lead.id}`} className="font-medium text-brand-600">{lead.full_name}</Link>} · {humanize(a.kind)}{a.body && <span className="text-ink-soft"> — {a.body}</span>}</p>
                  <time className="shrink-0 text-xs text-muted">{formatDate(a.created_at, { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
              );
            })}
            {!activity.data?.length && <p className="p-4 text-sm text-muted">No activity yet.</p>}
          </Card>
        </section>
      )}
    </>
  );
}
