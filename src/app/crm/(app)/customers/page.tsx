import type { Metadata } from "next";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, SortTh, StatCard, StatusPill, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { AutoSubmit, RangePicker } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange } from "@/lib/crm/dates";
import { fmtDate, money } from "@/lib/crm/format";
import { searchTerm } from "@/lib/crm/schemas";
import { sumColumns } from "@/lib/crm/sum";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customers" };
const PAGE_SIZE = 25;
const SORTS = new Set(["converted_at", "full_name", "package_amount", "balance"]);

export default async function CustomersPage({ searchParams }: PageProps<"/crm/customers">) {
  const viewer = await requireCrm("customers.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const config = await getCrmConfig();
  const fin = can(viewer, "finance.view") || can(viewer, "payments.view");
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "all");
  const sort = SORTS.has(str("sort")) && (fin || !["package_amount", "balance"].includes(str("sort"))) ? str("sort") : "converted_at";

  const supabase = await createClient();
  let q = supabase.from("crm_customers")
    .select("id, code, lead_code, full_name, mobile, email, visa_category, destination_country, consultant_id, converted_at, package_amount, amount_received, balance, payment_status, application_status, application_ref", { count: "exact" })
    .order(sort, { ascending: str("dir") === "asc" }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const term = searchTerm(str("q"));
  if (term) q = q.or(`full_name.ilike.*${term}*,email.ilike.*${term}*,mobile.ilike.*${term}*,code.ilike.*${term}*,lead_code.ilike.*${term}*,application_ref.ilike.*${term}*`);
  if (str("payment")) q = q.eq("payment_status", str("payment"));
  if (str("consultant")) q = q.eq("consultant_id", str("consultant"));
  if (str("country")) q = q.eq("destination_country", str("country"));
  if (str("app")) q = q.eq("application_status", str("app"));
  if (range.key !== "all") q = q.gte("converted_at", range.from.toISOString()).lt("converted_at", range.to.toISOString());
  const { data, count } = await q;

  const t = fin ? await sumColumns(() => supabase.from("crm_customers").select("package_amount, amount_received, balance"), ["package_amount", "amount_received", "balance"]) : null;

  return (
    <>
      <PageHeader title="Converted customers" description={`${(count ?? 0).toLocaleString("en-IN")} customers`}
        actions={can(viewer, "reports.export") && <a href={`/api/crm/reports/converted_customers?range=${range.key}&from=${range.fromDate}&to=${range.toDate}`} className={buttonClass("secondary", "sm")}><Download className="size-4" />Export Excel</a>} />
      {t && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total package value" value={money(t.package_amount, config.currency)} tone="brand" />
          <StatCard label="Received" value={money(t.amount_received, config.currency)} tone="green" />
          <StatCard label="Outstanding balance" value={money(t.balance, config.currency)} tone="amber" href={can(viewer, "reports.view") ? "/crm/reports?type=outstanding" : undefined} />
        </div>
      )}
      <FilterBar action="/crm/customers">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={str("q")} placeholder="Name, phone, customer / lead ID, ref" className={`${filterControl} w-full pl-9`} aria-label="Search" />
        </div>
        <AutoSubmit>
          {fin && <select name="payment" defaultValue={str("payment")} className={filterControl} aria-label="Payment status"><option value="">Any payment status</option><option value="unpaid">Unpaid</option><option value="partial">Partially paid</option><option value="paid">Paid</option><option value="overpaid">Overpaid</option></select>}
          <select name="app" defaultValue={str("app")} className={filterControl} aria-label="Application status"><option value="">Any application status</option>{config.options.application_status.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="country" defaultValue={str("country")} className={filterControl} aria-label="Country"><option value="">All destinations</option>{config.options.destination_country.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          {viewer.scope !== "own" && <select name="consultant" defaultValue={str("consultant")} className={filterControl} aria-label="Consultant"><option value="">All consultants</option>{assignableStaff(config).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
        </AutoSubmit>
        <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
        <button className={buttonClass("primary", "sm")}>Search</button>
      </FilterBar>
      <Table minWidth={1100}>
        <THead>
          <SortTh label="Customer" column="full_name" base="/crm/customers" params={sp} />
          <Th>Contact</Th><Th>Visa / destination</Th><Th>Consultant</Th>
          <SortTh label="Converted" column="converted_at" base="/crm/customers" params={sp} />
          {fin && <><SortTh label="Package" column="package_amount" base="/crm/customers" params={sp} className="text-right" /><Th className="text-right">Received</Th><SortTh label="Balance" column="balance" base="/crm/customers" params={sp} className="text-right" /><Th>Payment</Th></>}
          <Th>Application</Th>
        </THead>
        <TBody>
          {(data ?? []).map((c) => (
            <Tr key={c.id}>
              <Td><Link href={`/crm/customers/${c.id}`} className="font-semibold hover:text-brand-700">{c.full_name}</Link><p className="font-mono text-xs text-muted">{c.code} · {c.lead_code}</p></Td>
              <Td className="text-xs">{c.mobile ?? "—"}<br /><span className="text-muted">{c.email ?? ""}</span></Td>
              <Td className="text-xs">{config.label("visa_category", c.visa_category)}<br /><span className="text-muted">{config.label("destination_country", c.destination_country)}</span></Td>
              <Td className="text-xs">{config.staffName(c.consultant_id)}</Td>
              <Td className="whitespace-nowrap text-xs">{fmtDate(c.converted_at)}</Td>
              {fin && <>
                <Td className="text-right tabular-nums">{money(c.package_amount, config.currency)}</Td>
                <Td className="text-right tabular-nums text-success">{money(c.amount_received, config.currency)}</Td>
                <Td className={`text-right font-semibold tabular-nums ${Number(c.balance) > 0 ? "text-danger" : ""}`}>{money(c.balance, config.currency)}</Td>
                <Td><StatusPill status={c.payment_status} /></Td>
              </>}
              <Td className="text-xs">{c.application_status ? config.label("application_status", c.application_status) : <span className="text-muted">No application</span>}</Td>
            </Tr>
          ))}
          {!data?.length && <tr><td colSpan={fin ? 10 : 6}><Empty title="No customers yet" description="Converted leads appear here. Open a lead and use “Convert to customer”." /></td></tr>}
        </TBody>
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/customers" params={sp} />
    </>
  );
}
