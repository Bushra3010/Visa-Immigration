import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { requireSection } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { SERVICE_BY_SLUG } from "@/lib/content/visa-services";
import { APPLICATION_STATUSES } from "@/lib/immigration/status";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

export default async function AdminApplicationsPage({ searchParams }: PageProps<"/admin/applications">) {
  await requireSection("applications");
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("applications")
    .select("id, code, destination_country, visa_service_slug, status, next_action, ready_to_travel, updated_at, customer:profiles!applications_user_id_fkey(full_name, email), counsellor:profiles!applications_counsellor_id_fkey(full_name), documents(status)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (typeof status === "string" && status) query = query.eq("status", status);
  const { data } = await query;

  return (
    <>
      <PageHeader title="Applications" />
      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={typeof status === "string" ? status : ""} className="max-w-xs">
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <button className={buttonClass("primary")}>Filter</button>
      </form>
      <DataTable head={["Application", "Customer", "Destination / service", "Counsellor", "Docs pending", "Status", "Updated"]}>
        {(data ?? []).map((a) => {
          const customer = a.customer as unknown as { full_name: string; email: string } | null;
          const docs = (a.documents as { status: string }[]) ?? [];
          const pending = docs.filter((d) => ["requested", "reupload_required", "rejected"].includes(d.status)).length;
          const toReview = docs.filter((d) => ["uploaded", "under_review"].includes(d.status)).length;
          return (
            <tr key={a.id}>
              <Td><Link href={`/admin/applications/${a.code}`} className="font-mono font-medium text-brand-600">{a.code}</Link>{a.ready_to_travel && <p className="text-xs text-success">Ready to travel</p>}</Td>
              <Td className="text-xs">{customer?.full_name}<br /><span className="text-muted">{customer?.email}</span></Td>
              <Td className="text-xs">{COUNTRY_BY_SLUG.get(a.destination_country)?.name}<br />{a.visa_service_slug ? SERVICE_BY_SLUG.get(a.visa_service_slug)?.title : "—"}</Td>
              <Td className="text-xs">{(a.counsellor as unknown as { full_name: string } | null)?.full_name ?? "—"}</Td>
              <Td className="text-xs">{pending} with customer · {toReview} to review</Td>
              <Td><StatusBadge status={a.status} /></Td>
              <Td className="text-xs text-muted">{formatDate(a.updated_at)}</Td>
            </tr>
          );
        })}
        {!data?.length && <tr><Td className="text-muted">No applications.</Td></tr>}
      </DataTable>
    </>
  );
}
