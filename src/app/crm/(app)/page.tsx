import type { Metadata } from "next";
import Link from "next/link";
import {
  AlarmClock, BadgeCheck, Ban, CalendarClock, CircleDollarSign, FileWarning, Flame, Handshake, PhoneCall, Plane,
  Sparkles, TrendingDown, TrendingUp, UserPlus, Users, Wallet, XCircle,
} from "lucide-react";
import { Avatar, Empty, Panel, Pill, StatCard, TintBadge } from "@/components/crm/blocks";
import { BarList, ColumnChart, Donut, PairedColumns, StageStrip } from "@/components/crm/charts";
import { AutoRefresh, RangePicker } from "@/components/crm/interactive";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig, type CrmConfig } from "@/lib/crm/config";
import { addDays, RANGE_PRESETS, resolveRange, todayBounds } from "@/lib/crm/dates";
import { fmtDateTime, fmtTime, money, relativeTime } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

type FU = { id: string; title: string; type: string; due_at: string; assigned_to: string; lead: { id: string; full_name: string; code: string } | null; customer: { id: string; full_name: string; code: string } | null };

type Dash = {
  total: number; converted: number; converted_in_range: number; by_stage: Record<string, number>;
  by_day: { day: string; count: number }[]; by_visa: { key: string; count: number }[]; by_country: { key: string; count: number }[]; by_source: { key: string; count: number }[];
  followups_pending: number; followups_overdue: number; followups_today: number; documents_pending: number;
  finance: null | { revenue: number; expenses: number; outstanding: number; monthly: { month: string; revenue: number; expenses: number }[] };
  performance: null | { id: string; full_name: string | null; leads: number; converted: number; follow_ups_done: number; overdue: number; revenue: number | null }[];
};

const GROUPS = {
  new: ["new_lead"],
  contacted: ["attempted_contact", "contacted"],
  interested: ["interested", "consultation_scheduled", "consultation_completed"],
  documents: ["documents_pending"],
  inProgress: ["documents_received", "application_in_progress", "application_submitted", "under_embassy_review"],
  rejected: ["visa_rejected"],
};

export default async function CrmDashboard({ searchParams }: PageProps<"/crm">) {
  const viewer = await requireCrm("dashboard.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "30d");
  const config = await getCrmConfig();
  const supabase = await createClient();
  const { start, end } = todayBounds();
  const weekEnd = new Date(end.getTime() + 7 * 86_400_000);

  const [{ data: dashData, error }, dueSoon, overdue, tasks, activity] = await Promise.all([
    supabase.rpc("crm_dashboard", { p_from: range.from.toISOString(), p_to: range.to.toISOString() }),
    supabase.from("crm_follow_ups").select("id, title, type, due_at, assigned_to, lead:leads(id, full_name, code), customer:crm_customers(id, full_name, code)")
      .eq("status", "pending").gte("due_at", start.toISOString()).lt("due_at", weekEnd.toISOString()).order("due_at").limit(8),
    supabase.from("crm_follow_ups").select("id, title, type, due_at, assigned_to, lead:leads(id, full_name, code), customer:crm_customers(id, full_name, code)")
      .eq("status", "pending").lt("due_at", start.toISOString()).order("due_at").limit(8),
    supabase.from("crm_follow_ups").select("id, title, due_at, assigned_to, lead:leads(id, full_name), customer:crm_customers(id, full_name)")
      .eq("status", "pending").eq("type", "task").order("due_at").limit(6),
    can(viewer, "leads.view")
      ? supabase.from("crm_lead_history").select("id, event, created_at, actor_id, note, from_stage_id, to_stage_id, lead:leads(id, full_name, code)").order("created_at", { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
  ]);
  if (error) console.error("crm_dashboard failed", error);
  const d = (dashData ?? { total: 0, converted: 0, converted_in_range: 0, by_stage: {}, by_day: [], by_visa: [], by_country: [], by_source: [], followups_pending: 0, followups_overdue: 0, followups_today: 0, documents_pending: 0, finance: null, performance: null }) as Dash;

  const sumStages = (keys: string[]) => keys.reduce((a, k) => a + (d.by_stage[k] ?? 0), 0);
  const lostKeys = config.stages.filter((s) => s.is_lost).map((s) => s.key);
  const rate = d.total ? (d.converted / d.total) * 100 : 0;
  const q = `range=${range.key}${range.key === "custom" ? `&from=${range.fromDate}&to=${range.toDate}` : ""}`;

  // Fill the daily series so quiet days show as gaps.
  const days: { label: string; value: number; title: string }[] = [];
  const counts = new Map(d.by_day.map((x) => [x.day, x.count]));
  const firstDay = range.key === "all" ? d.by_day[0]?.day ?? range.toDate : range.fromDate;
  for (let day = firstDay, i = 0; day <= range.toDate && i < 400; day = addDays(day, 1), i++) {
    days.push({ label: day.slice(5).replace("-", "/"), value: counts.get(day) ?? 0, title: day });
  }

  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <AutoRefresh seconds={90} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting},</p>
          <h1 className="text-2xl font-bold tracking-tight">{viewer.fullName.split(" ")[0]} 👋</h1>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Period</span>
          <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
        </form>
      </div>

      {/* Follow-ups needing attention */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link href="/crm/follow-ups?view=today" className={cn("flex items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-md", d.followups_today ? "border-blue-200 bg-blue-50/60" : "border-line bg-white")}>
          <span className="grid size-12 place-items-center rounded-xl bg-blue-600 text-white"><CalendarClock className="size-6" /></span>
          <div><p className="text-3xl font-bold tabular-nums">{d.followups_today}</p><p className="text-sm text-ink-soft">follow-ups due today</p></div>
        </Link>
        <Link href="/crm/follow-ups?view=overdue" className={cn("flex items-center gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-md", d.followups_overdue ? "border-red-200 bg-red-50/60" : "border-line bg-white")}>
          <span className={cn("grid size-12 place-items-center rounded-xl text-white", d.followups_overdue ? "bg-red-600" : "bg-slate-400")}><AlarmClock className="size-6" /></span>
          <div><p className="text-3xl font-bold tabular-nums">{d.followups_overdue}</p><p className="text-sm text-ink-soft">overdue follow-ups{d.followups_overdue ? " — act now" : ""}</p></div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total leads" value={d.total} icon={<Users />} tone="brand" hint={range.label} href={`/crm/leads?${q}`} />
        <StatCard label="New leads" value={sumStages(GROUPS.new)} icon={<UserPlus />} tone="blue" />
        <StatCard label="Contacted" value={sumStages(GROUPS.contacted)} icon={<PhoneCall />} tone="teal" />
        <StatCard label="Interested" value={sumStages(GROUPS.interested)} icon={<Flame />} tone="orange" />
        <StatCard label="Follow-up pending" value={d.followups_pending} icon={<CalendarClock />} tone="violet" href="/crm/follow-ups" />
        <StatCard label="Documents pending" value={sumStages(GROUPS.documents)} icon={<FileWarning />} tone="amber" hint={`${d.documents_pending} file${d.documents_pending === 1 ? "" : "s"} awaiting verification`} />
        <StatCard label="Application in progress" value={sumStages(GROUPS.inProgress)} icon={<Plane />} tone="blue" />
        <StatCard label="Converted" value={d.converted} icon={<Handshake />} tone="green" hint={`${d.converted_in_range} converted in period`} />
        <StatCard label="Rejected" value={sumStages(GROUPS.rejected)} icon={<XCircle />} tone="red" />
        <StatCard label="Lost" value={sumStages(lostKeys)} icon={<Ban />} tone="slate" />
        {d.finance && (
          <>
            <StatCard label="Total revenue" value={money(d.finance.revenue, config.currency)} icon={<TrendingUp />} tone="green" hint={range.label} />
            <StatCard label="Total expenses" value={money(d.finance.expenses, config.currency)} icon={<TrendingDown />} tone="amber" hint="Approved only" />
            <StatCard label="Net profit" value={<span className={d.finance.revenue - d.finance.expenses < 0 ? "text-danger" : ""}>{money(d.finance.revenue - d.finance.expenses, config.currency)}</span>} icon={<CircleDollarSign />} tone={d.finance.revenue - d.finance.expenses < 0 ? "red" : "brand"} />
            <StatCard label="Outstanding" value={money(d.finance.outstanding, config.currency)} icon={<Wallet />} tone="violet" hint="All customers" href={can(viewer, "reports.view") ? "/crm/reports?type=outstanding" : undefined} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Panel title="Leads generated" description={range.label} className="xl:col-span-2">
          <ColumnChart data={days} />
        </Panel>
        <Panel title="Conversion rate" description="Leads created in period that became customers">
          <div className="flex flex-col items-center gap-4">
            <Donut value={rate} label="converted" size={140} />
            <div className="w-full">
              <StageStrip items={config.stages.map((s) => ({ label: s.name, value: d.by_stage[s.key] ?? 0, color: s.color }))} />
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Leads by visa category"><BarList items={d.by_visa.map((x) => ({ label: config.label("visa_category", x.key === "unknown" ? null : x.key), value: x.count }))} /></Panel>
        <Panel title="Leads by country"><BarList items={d.by_country.map((x) => ({ label: config.label("destination_country", x.key === "unknown" ? null : x.key), value: x.count, color: "var(--color-accent-500)" }))} /></Panel>
        <Panel title="Leads by source"><BarList items={d.by_source.map((x) => ({ label: config.label("lead_source", x.key === "unknown" ? null : x.key), value: x.count, color: "#8b5cf6" }))} /></Panel>
      </div>

      {d.finance && (
        <Panel title="Revenue vs expenses" description="Last 12 months (payments received · approved expenses)" className="mt-4">
          <PairedColumns data={d.finance.monthly.map((m) => ({ label: new Date(`${m.month}-01T00:00:00Z`).toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }), a: Number(m.revenue), b: Number(m.expenses) }))} format={(n) => money(n, config.currency)} />
        </Panel>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Upcoming follow-ups" description="Today and the next 7 days" action={<Link href="/crm/follow-ups?view=upcoming" className="text-sm font-medium text-brand-600">View all</Link>} bodyClassName="p-0">
          <FollowUpList items={(dueSoon.data ?? []) as unknown as FU[]} config={config} start={start} end={end} empty="Nothing scheduled this week." />
        </Panel>
        <Panel title="Overdue follow-ups" action={<Link href="/crm/follow-ups?view=overdue" className="text-sm font-medium text-brand-600">View all</Link>} bodyClassName="p-0">
          <FollowUpList items={(overdue.data ?? []) as unknown as FU[]} config={config} start={start} end={end} empty="No overdue follow-ups. 🎉" overdue />
        </Panel>
        <Panel title="Pending tasks" action={<Link href="/crm/follow-ups?type=task" className="text-sm font-medium text-brand-600">View all</Link>} bodyClassName="p-0">
          <FollowUpList items={(tasks.data ?? []) as unknown as FU[]} config={config} start={start} end={end} empty="No open tasks." />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {d.performance && (
          <Panel title="Employee performance" description={range.label} className="xl:col-span-3" bodyClassName="p-0">
            {d.performance.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wider text-muted"><tr className="border-b border-line">
                    <th className="px-4 py-2.5">Employee</th><th className="px-3 py-2.5 text-right">Leads</th><th className="px-3 py-2.5 text-right">Converted</th><th className="px-3 py-2.5 text-right">Rate</th><th className="px-3 py-2.5 text-right">Follow-ups</th><th className="px-3 py-2.5 text-right">Overdue</th>{d.finance && <th className="px-4 py-2.5 text-right">Revenue</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {d.performance.filter((p) => p.leads || p.follow_ups_done || p.overdue || Number(p.revenue)).slice(0, 10).map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Avatar name={p.full_name} size="sm" /><span className="truncate font-medium">{p.full_name ?? "—"}</span></span></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{p.leads}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{p.converted}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{p.leads ? Math.round((p.converted / p.leads) * 100) : 0}%</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{p.follow_ups_done}</td>
                        <td className="px-3 py-2.5 text-right">{p.overdue ? <Pill tone="danger">{p.overdue}</Pill> : <span className="text-muted">0</span>}</td>
                        {d.finance && <td className="px-4 py-2.5 text-right tabular-nums">{money(Number(p.revenue ?? 0), config.currency)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="No team activity yet" />}
          </Panel>
        )}
        <Panel title="Recent activity" className={d.performance ? "xl:col-span-2" : "xl:col-span-5"} bodyClassName="p-0">
          {(activity.data ?? []).length ? (
            <ul className="divide-y divide-line">
              {((activity.data ?? []) as unknown as { id: string; event: string; created_at: string; actor_id: string | null; note: string | null; from_stage_id: string | null; to_stage_id: string | null; lead: { id: string; full_name: string; code: string } | null }[]).map((a) => (
                <li key={a.id} className="flex gap-3 px-4 py-3 text-sm">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    {a.event === "converted" ? <BadgeCheck className="size-4" /> : a.event === "created" ? <Sparkles className="size-4" /> : <TrendingUp className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">
                      <span className="font-medium">{a.actor_id ? config.staffName(a.actor_id) : "Website"}</span>{" "}
                      {a.event === "stage_changed" && a.to_stage_id ? <>moved {a.lead ? <Link className="font-medium text-brand-700" href={`/crm/leads/${a.lead.id}`}>{a.lead.full_name}</Link> : "a lead"} to <TintBadge color={config.stageById.get(a.to_stage_id)?.color}>{config.stageById.get(a.to_stage_id)?.name ?? "—"}</TintBadge></>
                        : <>{a.event === "created" ? "added" : a.event === "converted" ? "converted" : a.event === "assigned" ? "reassigned" : "updated"} {a.lead ? <Link className="font-medium text-brand-700" href={`/crm/leads/${a.lead.id}`}>{a.lead.full_name}</Link> : "a lead"}{a.note && a.event !== "created" ? ` — ${a.note}` : ""}</>}
                    </p>
                    <p className="text-xs text-muted" title={fmtDateTime(a.created_at)}>{relativeTime(a.created_at)}{a.lead ? ` · ${a.lead.code}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <Empty title="No activity yet" description="Lead updates and stage moves will show up here." />}
        </Panel>
      </div>
    </>
  );
}

function FollowUpList({ items, empty, overdue: isOverdue, config, start, end }: { items: FU[]; config: CrmConfig; empty: string; overdue?: boolean; start: Date; end: Date }) {
  if (!items.length) return <p className="px-4 py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => {
        const target = f.lead ? { href: `/crm/leads/${f.lead.id}`, name: f.lead.full_name } : f.customer ? { href: `/crm/customers/${f.customer.id}`, name: f.customer.full_name } : null;
        const isToday = new Date(f.due_at) < end && new Date(f.due_at) >= start;
        return (
          <li key={f.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{target ? <Link href={target.href} className="hover:text-brand-700">{target.name}</Link> : f.title}</p>
              <p className="truncate text-xs text-muted">{f.title} · {config.staffName(f.assigned_to)}</p>
            </div>
            <span className={cn("shrink-0 text-right text-xs", isOverdue ? "font-semibold text-danger" : isToday ? "font-semibold text-blue-700" : "text-muted")}>
              {isOverdue ? relativeTime(f.due_at) : isToday ? `Today ${fmtTime(f.due_at)}` : fmtDateTime(f.due_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
