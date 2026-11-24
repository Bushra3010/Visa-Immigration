import type { Metadata } from "next";
import Link from "next/link";
import { List, Plus, Search } from "lucide-react";
import { filterControl, FilterBar, PageHeader } from "@/components/crm/blocks";
import { AutoSubmit } from "@/components/crm/interactive";
import { Kanban, type KanbanColumn } from "@/components/crm/kanban";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import { searchTerm } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pipeline" };
const PER_STAGE = 40;

export default async function PipelinePage({ searchParams }: PageProps<"/crm/pipeline">) {
  await requireCrm("pipeline.view");
  const viewer = await requireCrm("leads.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const config = await getCrmConfig();
  const supabase = await createClient();
  const term = searchTerm(str("q"));
  const stageFilter = str("stage");
  const stages = config.activeStages.filter((s) => !stageFilter || s.id === stageFilter);

  const results = await Promise.all(stages.map((s) => {
    let q = supabase.from("leads")
      .select("id, code, full_name, mobile, destination_country, visa_type, temperature, assigned_counsellor_id, next_follow_up_at, converted_at", { count: "exact" })
      .eq("stage_id", s.id).order("stage_changed_at", { ascending: false, nullsFirst: false }).limit(PER_STAGE);
    if (term) q = q.or(`full_name.ilike.*${term}*,email.ilike.*${term}*,code.ilike.*${term}*,mobile.ilike.*${term}*`);
    if (str("temperature")) q = q.eq("temperature", str("temperature"));
    if (str("visa")) q = q.eq("visa_type", str("visa"));
    if (str("country")) q = q.eq("destination_country", str("country"));
    if (str("assigned") === "me") q = q.eq("assigned_counsellor_id", viewer.id);
    else if (str("assigned") === "none") q = q.is("assigned_counsellor_id", null);
    else if (str("assigned")) q = q.eq("assigned_counsellor_id", str("assigned"));
    if (str("overdue") === "1") q = q.lt("next_follow_up_at", new Date().toISOString());
    return q;
  }));

  const columns: KanbanColumn[] = stages.map((s, i) => ({
    id: s.id, name: s.name, color: s.color, isWon: s.is_won, isLost: s.is_lost, count: results[i].count ?? 0,
    cards: (results[i].data ?? []).map((l) => ({
      id: l.id, code: l.code, name: l.full_name, mobile: l.mobile, temperature: l.temperature,
      country: config.label("destination_country", l.destination_country), visa: config.label("visa_category", l.visa_type),
      assignee: config.staffName(l.assigned_counsellor_id), followUp: l.next_follow_up_at, converted: !!l.converted_at,
    })),
  }));
  const total = columns.reduce((a, c) => a + c.count, 0);
  const staff = assignableStaff(config);

  return (
    <>
      <PageHeader title="Lead pipeline" description={`${total.toLocaleString("en-IN")} leads across ${columns.length} stages · drag cards to change stage`}
        actions={<>
          <Link href="/crm/leads" className={buttonClass("secondary", "sm")}><List className="size-4" />List view</Link>
          {can(viewer, "settings.edit") && <Link href="/crm/settings/stages" className={buttonClass("secondary", "sm")}>Edit stages</Link>}
          {can(viewer, "leads.create") && <Link href="/crm/leads/new" className={buttonClass("primary", "sm")}><Plus className="size-4" />New lead</Link>}
        </>} />
      <FilterBar action="/crm/pipeline">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={str("q")} placeholder="Search name, phone, ID" className={`${filterControl} w-full pl-9`} aria-label="Search" />
        </div>
        <AutoSubmit>
          <select name="stage" defaultValue={stageFilter} className={filterControl} aria-label="Stage"><option value="">All stages</option>{config.activeStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select name="temperature" defaultValue={str("temperature")} className={filterControl} aria-label="Priority"><option value="">Any priority</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option></select>
          <select name="visa" defaultValue={str("visa")} className={filterControl} aria-label="Visa"><option value="">All visa types</option>{config.options.visa_category.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="country" defaultValue={str("country")} className={filterControl} aria-label="Country"><option value="">All countries</option>{config.options.destination_country.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          {viewer.scope !== "own" && (
            <select name="assigned" defaultValue={str("assigned")} className={filterControl} aria-label="Assigned"><option value="">Anyone</option><option value="me">Mine</option><option value="none">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-ink-soft"><input type="checkbox" name="overdue" value="1" defaultChecked={str("overdue") === "1"} className="size-4 accent-brand-600" />Overdue follow-ups</label>
        </AutoSubmit>
        <button className={buttonClass("primary", "sm")}>Apply</button>
        {Object.keys(sp).length > 0 && <Link href="/crm/pipeline" className="text-sm text-muted hover:text-ink">Reset</Link>}
      </FilterBar>
      <Kanban columns={columns} canEdit={can(viewer, "pipeline.edit") && can(viewer, "leads.edit")} />
    </>
  );
}
