import type { Metadata } from "next";
import { filterControl, FilterBar, PageHeader, Pagination, Panel, Tabs } from "@/components/crm/blocks";
import { AutoSubmit } from "@/components/crm/interactive";
import { FollowUpList, type FollowUpView } from "@/components/crm/records";
import { can, requireCrm } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import { todayBounds } from "@/lib/crm/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Follow-ups & tasks" };
const PAGE_SIZE = 30;
const VIEWS = ["today", "overdue", "upcoming", "completed", "missed", "all"] as const;
type View = (typeof VIEWS)[number];

export default async function FollowUpsPage({ searchParams }: PageProps<"/crm/follow-ups">) {
  const viewer = await requireCrm();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const view: View = (VIEWS as readonly string[]).includes(str("view")) ? (str("view") as View) : "today";
  const page = Math.max(1, Number(str("page")) || 1);
  const config = await getCrmConfig();
  const supabase = await createClient();
  const { start, end } = todayBounds();
  const nowIso = new Date().toISOString();
  const seeOthers = viewer.scope !== "own" || can(viewer, "performance.view");
  const who = str("assigned") || (seeOthers ? "" : "me");

  const base = () => {
    let q = supabase.from("crm_follow_ups").select("id", { count: "exact", head: true });
    if (who === "me") q = q.eq("assigned_to", viewer.id);
    else if (who) q = q.eq("assigned_to", who);
    if (str("type")) q = q.eq("type", str("type"));
    return q;
  };
  const [cToday, cOverdue, cUpcoming] = await Promise.all([
    base().eq("status", "pending").gte("due_at", start.toISOString()).lt("due_at", end.toISOString()),
    base().eq("status", "pending").lt("due_at", nowIso),
    base().eq("status", "pending").gte("due_at", end.toISOString()),
  ]);

  let q = supabase
    .from("crm_follow_ups")
    .select("id, title, type, notes, due_at, status, outcome, assigned_to, completed_at, created_by, lead:leads(id, full_name, code), customer:crm_customers(id, full_name, code)", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (who === "me") q = q.eq("assigned_to", viewer.id);
  else if (who) q = q.eq("assigned_to", who);
  if (str("type")) q = q.eq("type", str("type"));
  if (view === "today") q = q.eq("status", "pending").gte("due_at", start.toISOString()).lt("due_at", end.toISOString()).order("due_at");
  else if (view === "overdue") q = q.eq("status", "pending").lt("due_at", nowIso).order("due_at");
  else if (view === "upcoming") q = q.eq("status", "pending").gte("due_at", end.toISOString()).order("due_at");
  else if (view === "completed") q = q.eq("status", "completed").order("completed_at", { ascending: false });
  else if (view === "missed") q = q.eq("status", "missed").order("due_at", { ascending: false });
  else q = q.order("due_at", { ascending: false });
  const { data, count } = await q;
  const staff = assignableStaff(config);

  return (
    <>
      <PageHeader title="Follow-ups & tasks" description="Calls, meetings and tasks across your leads and customers. Schedule new ones from a lead or customer page." />
      <Tabs base="/crm/follow-ups" params={sp} param="view" active={view} tabs={[
        { key: "today", label: "Today", count: cToday.count ?? 0 },
        { key: "overdue", label: "Overdue", count: cOverdue.count ?? 0 },
        { key: "upcoming", label: "Upcoming", count: cUpcoming.count ?? 0 },
        { key: "completed", label: "Completed" },
        { key: "missed", label: "Missed" },
        { key: "all", label: "All" },
      ]} />
      <FilterBar action="/crm/follow-ups">
        <input type="hidden" name="view" value={view} />
        <AutoSubmit>
          {seeOthers && (
            <select name="assigned" defaultValue={who} className={filterControl} aria-label="Assigned to">
              <option value="">Everyone I can see</option><option value="me">Assigned to me</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
            </select>
          )}
          <select name="type" defaultValue={str("type")} className={filterControl} aria-label="Type">
            <option value="">All types</option>
            {["call", "whatsapp", "email", "meeting", "task", "other"].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
          </select>
        </AutoSubmit>
      </FilterBar>
      <Panel bodyClassName="px-4 py-1 sm:px-5">
        <FollowUpList items={(data ?? []) as unknown as FollowUpView[]} config={config} viewer={viewer} showTarget />
      </Panel>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/follow-ups" params={sp} />
    </>
  );
}
