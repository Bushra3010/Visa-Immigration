import type { Metadata } from "next";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, Pill, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { AutoSubmit, RangePicker } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange } from "@/lib/crm/dates";
import { fmtDateTime } from "@/lib/crm/format";
import { searchTerm } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit log" };
const PAGE_SIZE = 50;
const MODULES = ["auth", "leads", "follow_ups", "customers", "applications", "documents", "payments", "expenses", "reports", "users", "settings"];

function tone(action: string) {
  if (/deleted|denied|failed|rejected|deactivated/.test(action)) return "danger" as const;
  if (/created|added|uploaded|converted|approved|login$|activated/.test(action)) return "success" as const;
  if (/permission|role/.test(action)) return "warning" as const;
  return "neutral" as const;
}

export default async function AuditPage({ searchParams }: PageProps<"/crm/audit">) {
  await requireCrm("audit.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "7d");
  const config = await getCrmConfig();
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, actor_id, action, module, entity, entity_id, changes, ip, user_agent, created_at", { count: "exact" })
    .gte("created_at", range.from.toISOString()).lt("created_at", range.to.toISOString())
    .order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (str("module")) q = q.eq("module", str("module"));
  if (str("user")) q = q.eq("actor_id", str("user"));
  const action = searchTerm(str("action"));
  if (action) q = q.ilike("action", `%${action}%`);
  if (str("record")) q = q.eq("entity_id", searchTerm(str("record")));
  const { data, count } = await q;

  return (
    <>
      <PageHeader title="Activity log & audit trail" description="Every sign-in, change, deletion and export. Entries can't be edited or deleted." />
      <FilterBar action="/crm/audit">
        <AutoSubmit>
          <select name="module" defaultValue={str("module")} className={filterControl} aria-label="Module"><option value="">All modules</option>{MODULES.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select>
          <select name="user" defaultValue={str("user")} className={filterControl} aria-label="User"><option value="">All users</option>{config.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name ?? s.email}</option>)}</select>
        </AutoSubmit>
        <input name="action" defaultValue={str("action")} placeholder="Action, e.g. deleted" className={`${filterControl} w-40`} aria-label="Action" />
        <input name="record" defaultValue={str("record")} placeholder="Record ID" className={`${filterControl} w-44`} aria-label="Record ID" />
        <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
        <button className={buttonClass("primary", "sm")}>Filter</button>
      </FilterBar>
      <Table minWidth={980}>
        <THead><Th>When</Th><Th>User</Th><Th>Action</Th><Th>Module</Th><Th>Record</Th><Th>Changes</Th><Th>IP</Th></THead>
        <TBody>
          {(data ?? []).map((l) => (
            <Tr key={l.id}>
              <Td className="whitespace-nowrap text-xs">{fmtDateTime(l.created_at)}</Td>
              <Td className="text-xs font-medium">{l.actor_id ? config.staffName(l.actor_id) : <span className="text-muted">Anonymous</span>}</Td>
              <Td><Pill tone={tone(l.action)}>{l.action}</Pill></Td>
              <Td className="text-xs">{l.module ?? l.entity}</Td>
              <Td className="max-w-40 truncate font-mono text-[11px] text-muted" title={l.entity_id ?? ""}>{l.entity_id ?? "—"}</Td>
              <Td className="max-w-md">
                {l.changes ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-brand-700">View ({Object.keys(l.changes as object).length} fields)</summary>
                    <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-canvas p-2 text-[11px]">{JSON.stringify(l.changes, null, 2)}</pre>
                  </details>
                ) : <span className="text-xs text-muted">—</span>}
              </Td>
              <Td className="font-mono text-[11px] text-muted" >{(l.ip as string | null) ?? "—"}</Td>
            </Tr>
          ))}
          {!data?.length && <tr><td colSpan={7}><Empty title="No activity in this period" /></td></tr>}
        </TBody>
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/audit" params={sp} />
    </>
  );
}
