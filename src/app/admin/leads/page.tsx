import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { requireSection } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { LEAD_STATUSES } from "@/lib/immigration/status";
import { COUNTRY_OPTIONS } from "@/lib/leads/options";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };
const PAGE_SIZE = 25;

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await requireSection("leads");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, code, full_name, mobile, email, destination_country, visa_type, eligibility_status, source, status, priority, created_at, last_contacted_at, next_follow_up_at, counsellor:profiles!leads_assigned_counsellor_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (str("status")) query = query.eq("status", str("status"));
  if (str("country")) query = query.eq("destination_country", str("country"));
  if (str("followup") === "due") query = query.lte("next_follow_up_at", new Date().toISOString());
  if (str("q")) {
    const q = str("q").replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,mobile.ilike.%${q}%,code.ilike.%${q}%`);
  }
  const { data, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pageHref = (p: number) => `/admin/leads?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>, page: String(p) })}`;

  return (
    <>
      <PageHeader title="Leads" description={`${count ?? 0} leads`} actions={<a download href="/api/admin/reports/leads" className={buttonClass("secondary", "sm")}>Export CSV</a>} />
      <form className="mb-4 grid gap-2 sm:grid-cols-5">
        <Input name="q" placeholder="Search name, email, mobile, ID" defaultValue={str("q")} className="sm:col-span-2" />
        <Select name="status" defaultValue={str("status")}><option value="">All statuses</option>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
        <Select name="country" defaultValue={str("country")}><option value="">All countries</option>{COUNTRY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
        <div className="flex gap-2">
          <Select name="followup" defaultValue={str("followup")}><option value="">Any follow-up</option><option value="due">Follow-up due</option></Select>
          <button className={buttonClass("primary", "md")}>Filter</button>
        </div>
      </form>
      <DataTable head={["Lead", "Contact", "Country / visa", "Eligibility", "Source", "Counsellor", "Status", "Priority", "Follow-up", "Created"]}>
        {(data ?? []).map((l) => (
          <tr key={l.id}>
            <Td><Link href={`/admin/leads/${l.id}`} className="font-medium text-brand-600">{l.full_name}</Link><p className="font-mono text-xs text-muted">{l.code}</p></Td>
            <Td className="text-xs">{l.mobile}<br />{l.email}</Td>
            <Td className="text-xs">{COUNTRY_BY_SLUG.get(l.destination_country ?? "")?.name ?? "—"}<br />{l.visa_type ? humanize(l.visa_type) : "—"}</Td>
            <Td><StatusBadge status={l.eligibility_status} /></Td>
            <Td className="text-xs">{humanize(l.source)}</Td>
            <Td className="text-xs">{(l.counsellor as unknown as { full_name: string } | null)?.full_name ?? <span className="text-warning">Unassigned</span>}</Td>
            <Td><StatusBadge status={l.status} /></Td>
            <Td><StatusBadge status={l.priority} /></Td>
            <Td className="text-xs">{l.next_follow_up_at ? formatDate(l.next_follow_up_at) : "—"}</Td>
            <Td className="text-xs text-muted">{formatDate(l.created_at)}</Td>
          </tr>
        ))}
        {!data?.length && <tr><Td className="text-muted">No leads match.</Td></tr>}
      </DataTable>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={pageHref(page - 1)} className="text-brand-600">← Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={pageHref(page + 1)} className="text-brand-600">Next →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
