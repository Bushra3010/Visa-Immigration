import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, SortTh, Table, TBody, Td, THead, Th, TintBadge, Tr } from "@/components/crm/blocks";
import { AutoSubmit } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { requireCrm } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import { fmtDate, fmtDateTime } from "@/lib/crm/format";
import { searchTerm } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visa applications" };
const PAGE_SIZE = 25;
const SORTS = new Set(["created_at", "submission_date", "appointment_at", "decision_date", "updated_at"]);

export default async function ApplicationsPage({ searchParams }: PageProps<"/crm/applications">) {
  const viewer = await requireCrm("applications.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const config = await getCrmConfig();
  const supabase = await createClient();
  const sort = SORTS.has(str("sort")) ? str("sort") : "updated_at";

  let q = supabase.from("crm_applications")
    .select("id, code, visa_type, destination_country, status, submission_date, appointment_at, biometrics_date, decision_date, consultant_id, embassy_name, updated_at, customer:crm_customers!inner(id, code, full_name, mobile)", { count: "exact" })
    .order(sort, { ascending: str("dir") === "asc", nullsFirst: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const term = searchTerm(str("q"));
  if (term) q = q.or(`code.ilike.*${term}*,embassy_reference.ilike.*${term}*,passport_number.ilike.*${term}*`);
  if (str("customer")) q = q.ilike("customer.full_name", `%${searchTerm(str("customer"))}%`);
  if (str("status")) q = q.eq("status", str("status"));
  if (str("country")) q = q.eq("destination_country", str("country"));
  if (str("visa")) q = q.eq("visa_type", str("visa"));
  if (str("consultant")) q = q.eq("consultant_id", str("consultant"));
  if (str("upcoming") === "appointments") q = q.gte("appointment_at", new Date().toISOString());
  const { data, count } = await q;

  return (
    <>
      <PageHeader title="Visa applications" description={`${(count ?? 0).toLocaleString("en-IN")} applications · create new ones from a customer page`} />
      <FilterBar action="/crm/applications">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={str("q")} placeholder="Application ID, passport, embassy ref" className={`${filterControl} w-full pl-9`} aria-label="Search" />
        </div>
        <input name="customer" defaultValue={str("customer")} placeholder="Customer name" className={`${filterControl} w-full sm:w-44`} aria-label="Customer" />
        <AutoSubmit>
          <select name="status" defaultValue={str("status")} className={filterControl} aria-label="Status"><option value="">All statuses</option>{config.options.application_status.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="country" defaultValue={str("country")} className={filterControl} aria-label="Country"><option value="">All destinations</option>{config.options.destination_country.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="visa" defaultValue={str("visa")} className={filterControl} aria-label="Visa"><option value="">All visa types</option>{config.options.visa_category.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          {viewer.scope !== "own" && <select name="consultant" defaultValue={str("consultant")} className={filterControl} aria-label="Consultant"><option value="">All consultants</option>{assignableStaff(config).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
          <select name="upcoming" defaultValue={str("upcoming")} className={filterControl} aria-label="Appointments"><option value="">Any</option><option value="appointments">Upcoming appointments</option></select>
        </AutoSubmit>
        <button className={buttonClass("primary", "sm")}>Search</button>
      </FilterBar>
      <Table minWidth={1100}>
        <THead>
          <Th>Application</Th><Th>Customer</Th><Th>Visa / destination</Th><Th>Status</Th>
          <SortTh label="Submitted" column="submission_date" base="/crm/applications" params={sp} />
          <SortTh label="Appointment" column="appointment_at" base="/crm/applications" params={sp} />
          <SortTh label="Decision" column="decision_date" base="/crm/applications" params={sp} />
          <Th>Consultant</Th>
          <SortTh label="Updated" column="updated_at" base="/crm/applications" params={sp} />
        </THead>
        <TBody>
          {(data ?? []).map((a) => {
            const c = a.customer as unknown as { id: string; code: string; full_name: string; mobile: string | null };
            return (
              <Tr key={a.id}>
                <Td><Link href={`/crm/applications/${a.id}`} className="font-mono font-semibold text-brand-700">{a.code}</Link>{a.embassy_name && <p className="max-w-40 truncate text-xs text-muted">{a.embassy_name}</p>}</Td>
                <Td><Link href={`/crm/customers/${c.id}`} className="font-medium hover:text-brand-700">{c.full_name}</Link><p className="font-mono text-xs text-muted">{c.code}</p></Td>
                <Td className="text-xs">{config.label("visa_category", a.visa_type)}<br /><span className="text-muted">{config.label("destination_country", a.destination_country)}</span></Td>
                <Td><TintBadge color={config.color("application_status", a.status)}>{config.label("application_status", a.status)}</TintBadge></Td>
                <Td className="whitespace-nowrap text-xs">{fmtDate(a.submission_date)}</Td>
                <Td className="whitespace-nowrap text-xs">{fmtDateTime(a.appointment_at)}</Td>
                <Td className="whitespace-nowrap text-xs">{fmtDate(a.decision_date)}</Td>
                <Td className="text-xs">{config.staffName(a.consultant_id)}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(a.updated_at)}</Td>
              </Tr>
            );
          })}
          {!data?.length && <tr><td colSpan={9}><Empty title="No applications found" description="Open a customer and click “New application”." /></td></tr>}
        </TBody>
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/applications" params={sp} />
    </>
  );
}
