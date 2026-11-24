import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { filterControl, FilterBar, PageHeader, Pagination } from "@/components/crm/blocks";
import { AutoSubmit, RangePicker } from "@/components/crm/interactive";
import { LeadsTable } from "@/components/crm/leads-table";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange, todayBounds } from "@/lib/crm/dates";
import { searchTerm } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leads" };
const PAGE_SIZE = 25;
const SORTS = new Set(["created_at", "full_name", "temperature", "next_follow_up_at"]);

export default async function LeadsPage({ searchParams }: PageProps<"/crm/leads">) {
  const viewer = await requireCrm("leads.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const config = await getCrmConfig();
  const page = Math.max(1, Number(str("page")) || 1);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "all");
  const sort = SORTS.has(str("sort")) ? str("sort") : "created_at";
  const asc = str("dir") === "asc";

  const supabase = await createClient();
  let q = supabase
    .from("leads")
    .select("id, code, full_name, mobile, email, destination_country, visa_type, source, stage_id, temperature, assigned_counsellor_id, next_follow_up_at, created_at, converted_at", { count: "exact" })
    .order(sort, { ascending: asc, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (range.key !== "all") q = q.gte("created_at", range.from.toISOString()).lt("created_at", range.to.toISOString());
  const term = searchTerm(str("q"));
  if (term) {
    const digits = term.replace(/\D/g, "");
    const ors = [`full_name.ilike.*${term}*`, `email.ilike.*${term}*`, `code.ilike.*${term}*`, `mobile.ilike.*${term}*`];
    if (digits.length >= 4) ors.push(`mobile_digits.ilike.*${digits.slice(-10)}*`, `whatsapp.ilike.*${digits.slice(-10)}*`);
    q = q.or(ors.join(","));
  }
  if (str("stage")) q = q.eq("stage_id", str("stage"));
  if (str("temperature")) q = q.eq("temperature", str("temperature"));
  if (str("source")) q = q.eq("source", str("source"));
  if (str("visa")) q = q.eq("visa_type", str("visa"));
  if (str("country")) q = q.eq("destination_country", str("country"));
  if (str("assigned") === "none") q = q.is("assigned_counsellor_id", null);
  else if (str("assigned") === "me") q = q.eq("assigned_counsellor_id", viewer.id);
  else if (str("assigned")) q = q.eq("assigned_counsellor_id", str("assigned"));
  const { start, end } = todayBounds();
  if (str("followup") === "overdue") q = q.lt("next_follow_up_at", new Date().toISOString());
  else if (str("followup") === "today") q = q.gte("next_follow_up_at", start.toISOString()).lt("next_follow_up_at", end.toISOString());
  else if (str("followup") === "upcoming") q = q.gte("next_follow_up_at", new Date().toISOString());
  else if (str("followup") === "none") q = q.is("next_follow_up_at", null);
  if (str("status") === "open") q = q.is("converted_at", null);
  else if (str("status") === "converted") q = q.not("converted_at", "is", null);

  const { data, count, error } = await q;
  if (error) console.error("Leads query failed", error);
  const staff = assignableStaff(config);
  const rows = (data ?? []).map((l) => ({
    id: l.id, code: l.code, full_name: l.full_name, mobile: l.mobile, email: l.email,
    country: config.label("destination_country", l.destination_country), visa: config.label("visa_category", l.visa_type), source: config.label("lead_source", l.source),
    stage: l.stage_id && config.stageById.get(l.stage_id) ? { name: config.stageById.get(l.stage_id)!.name, color: config.stageById.get(l.stage_id)!.color } : null,
    temperature: l.temperature, assignee: config.staffName(l.assigned_counsellor_id), follow_up: l.next_follow_up_at, created_at: l.created_at, converted: !!l.converted_at,
  }));
  const exportHref = `/api/crm/reports/leads?range=${range.key}${range.key === "custom" ? `&from=${range.fromDate}&to=${range.toDate}` : ""}`;

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${(count ?? 0).toLocaleString("en-IN")} lead${count === 1 ? "" : "s"}${viewer.scope === "own" ? " assigned to you" : viewer.scope === "team" ? " in your team" : ""}`}
        actions={<>
          {can(viewer, "leads.export") && <a href={exportHref} className={buttonClass("secondary", "sm")}><Download className="size-4" />Export Excel</a>}
          {can(viewer, "pipeline.view") && <Link href="/crm/pipeline" className={buttonClass("secondary", "sm")}>Pipeline view</Link>}
          {can(viewer, "leads.create") && <Link href="/crm/leads/new" className={buttonClass("primary", "sm")}><Plus className="size-4" />New lead</Link>}
        </>}
      />
      <FilterBar action="/crm/leads">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={str("q")} placeholder="Name, phone, email, lead ID" className={`${filterControl} w-full pl-9`} aria-label="Search" />
        </div>
        <AutoSubmit>
          <select name="stage" defaultValue={str("stage")} className={filterControl} aria-label="Stage">
            <option value="">All stages</option>
            {config.stages.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? "" : " (hidden)"}</option>)}
          </select>
          <select name="temperature" defaultValue={str("temperature")} className={filterControl} aria-label="Priority">
            <option value="">Any priority</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
          </select>
          <select name="source" defaultValue={str("source")} className={filterControl} aria-label="Source">
            <option value="">All sources</option>{config.options.lead_source.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}
          </select>
          <select name="visa" defaultValue={str("visa")} className={filterControl} aria-label="Visa type">
            <option value="">All visa types</option>{config.options.visa_category.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}
          </select>
          <select name="country" defaultValue={str("country")} className={filterControl} aria-label="Country">
            <option value="">All countries</option>{config.options.destination_country.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}
          </select>
          {viewer.scope !== "own" && (
            <select name="assigned" defaultValue={str("assigned")} className={filterControl} aria-label="Assigned to">
              <option value="">Anyone</option><option value="me">Assigned to me</option><option value="none">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}
            </select>
          )}
          <select name="followup" defaultValue={str("followup")} className={filterControl} aria-label="Follow-up">
            <option value="">Any follow-up</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Upcoming</option><option value="none">No follow-up set</option>
          </select>
          <select name="status" defaultValue={str("status")} className={filterControl} aria-label="Conversion">
            <option value="">Open & converted</option><option value="open">Open only</option><option value="converted">Converted only</option>
          </select>
        </AutoSubmit>
        <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
        <button className={buttonClass("primary", "sm")}>Search</button>
        {Object.keys(sp).length > 0 && <Link href="/crm/leads" className="text-sm text-muted hover:text-ink">Reset</Link>}
      </FilterBar>
      <LeadsTable rows={rows} params={sp} canAssign={can(viewer, "leads.assign") || can(viewer, "leads.reassign")} staff={staff.map((s) => ({ id: s.id, name: s.full_name ?? s.email ?? "" }))} />
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/leads" params={sp} />
    </>
  );
}
