import type { Metadata } from "next";
import Link from "next/link";
import { PlaneTakeoff } from "lucide-react";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { StatCard } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { Card, EmptyState, Notice } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "My dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const viewer = await requireViewer();
  const { passwordUpdated } = await searchParams;
  const supabase = await createClient();

  const [apps, docs, consultations, bookings] = await Promise.all([
    supabase.from("applications").select("id, code, destination_country, visa_service_slug, status, next_action, ready_to_travel, updated_at").order("updated_at", { ascending: false }),
    supabase.from("documents").select("id, status").in("status", ["requested", "reupload_required", "rejected"]),
    supabase.from("consultations").select("code, preferred_at, consultation_type, status").gte("preferred_at", new Date().toISOString()).order("preferred_at").limit(3),
    supabase.from("travel_bookings").select("code, total_amount, currency, status, created_at").order("created_at", { ascending: false }).limit(3),
  ]);

  const readyToTravel = (apps.data ?? []).filter((a) => a.ready_to_travel || a.status === "approved");

  return (
    <>
      <PageHeader title={`Hello${viewer.fullName ? `, ${viewer.fullName.split(" ")[0]}` : ""}`} description="Here's what's happening with your applications and trips." />
      {passwordUpdated && <Notice tone="success" className="mb-4">Your password has been updated.</Notice>}

      {readyToTravel.map((a) => (
        <div key={a.id} className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-brand-700 to-brand-500 p-5 text-white">
          <div className="flex items-center gap-3">
            <PlaneTakeoff className="size-8" />
            <div>
              <p className="text-lg font-semibold">Your visa process is complete. Plan your journey</p>
              <p className="text-sm text-brand-100">Application {a.code} · {COUNTRY_BY_SLUG.get(a.destination_country)?.name ?? a.destination_country}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/flights?application=${a.id}`} className={buttonClass("accent", "sm")}>Book flight</Link>
            <Link href={`/hotels?application=${a.id}`} className={buttonClass("secondary", "sm")}>Book hotel</Link>
            <Link href="/flight-hotel" className="rounded-lg px-3 py-1.5 text-sm font-medium text-white underline-offset-4 hover:underline">View travel options</Link>
          </div>
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active applications" value={(apps.data ?? []).filter((a) => !["approved", "rejected", "withdrawn"].includes(a.status)).length} />
        <StatCard label="Documents needed" value={docs.data?.length ?? 0} hint={docs.data?.length ? <Link className="text-brand-600" href="/dashboard/documents">Upload now →</Link> : "All caught up"} />
        <StatCard label="Upcoming consultations" value={consultations.data?.length ?? 0} />
        <StatCard label="Trips booked" value={bookings.data?.length ?? 0} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">My applications</h2><Link href="/dashboard/applications" className="text-sm text-brand-600">View all</Link></div>
          {apps.data?.length ? (
            <ul className="space-y-3">
              {apps.data.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link href={`/dashboard/applications/${a.code}`} className="block rounded-xl border border-line bg-white p-4 hover:border-brand-200">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{COUNTRY_BY_SLUG.get(a.destination_country)?.name ?? a.destination_country}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">{a.code} · Updated {formatDate(a.updated_at)}</p>
                    {a.next_action && <p className="mt-2 text-sm text-ink-soft"><span className="font-medium text-ink">Next:</span> {a.next_action}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No applications yet" description="Start with a free eligibility assessment." action={<Link href="/eligibility" className={buttonClass("accent", "sm")}>Check eligibility</Link>} />
          )}
        </section>
        <section className="space-y-6">
          <div>
            <h2 className="mb-3 font-semibold">Upcoming consultations</h2>
            {consultations.data?.length ? (
              <Card className="divide-y divide-line">
                {consultations.data.map((c) => (
                  <div key={c.code} className="flex items-center justify-between p-4 text-sm">
                    <div><p className="font-medium">{formatDate(c.preferred_at, { dateStyle: "medium", timeStyle: "short" })}</p><p className="text-muted capitalize">{c.consultation_type} · {c.code}</p></div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </Card>
            ) : <EmptyState title="No upcoming consultations" action={<Link href="/consultation" className={buttonClass("secondary", "sm")}>Book consultation</Link>} />}
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent bookings</h2><Link href="/dashboard/bookings" className="text-sm text-brand-600">View all</Link></div>
            {bookings.data?.length ? (
              <Card className="divide-y divide-line">
                {bookings.data.map((b) => (
                  <Link key={b.code} href={`/dashboard/bookings/${b.code}`} className="flex items-center justify-between p-4 text-sm hover:bg-canvas">
                    <div><p className="font-medium">{b.code}</p><p className="text-muted">{formatMoney(Number(b.total_amount), b.currency)}</p></div>
                    <StatusBadge status={b.status} />
                  </Link>
                ))}
              </Card>
            ) : <EmptyState title="No bookings yet" action={<Link href="/flights" className={buttonClass("secondary", "sm")}>Search flights</Link>} />}
          </div>
        </section>
      </div>
    </>
  );
}
