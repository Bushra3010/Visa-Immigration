import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Image as ImageIcon } from "lucide-react";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, StatusPill, Tabs } from "@/components/crm/blocks";
import { AutoSubmit } from "@/components/crm/interactive";
import { DocumentActions } from "@/components/crm/record-actions";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { bytes, fmtDateTime } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };
const PAGE_SIZE = 30;

export default async function DocumentsPage({ searchParams }: PageProps<"/crm/documents">) {
  const viewer = await requireCrm("documents.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = ["pending", "verified", "rejected", "all"].includes(str("status")) ? str("status") : "pending";
  const page = Math.max(1, Number(str("page")) || 1);
  const config = await getCrmConfig();
  const supabase = await createClient();

  const count = (s: string) => supabase.from("crm_documents").select("id", { count: "exact", head: true }).eq("status", s);
  const [p, v, r] = await Promise.all([count("pending"), count("verified"), count("rejected")]);
  let q = supabase.from("crm_documents")
    .select("id, doc_type, title, file_name, mime_type, size_bytes, status, remarks, uploaded_by, created_at, verified_by, verified_at, lead:leads(id, full_name, code), customer:crm_customers(id, full_name, code), application:crm_applications(id, code)", { count: "exact" })
    .order("created_at", { ascending: status === "pending" }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== "all") q = q.eq("status", status);
  if (str("type")) q = q.eq("doc_type", str("type"));
  if (str("uploader")) q = q.eq("uploaded_by", str("uploader") === "me" ? viewer.id : str("uploader"));
  const { data, count: total } = await q;
  const canVerify = can(viewer, "documents.approve") || can(viewer, "documents.edit");

  return (
    <>
      <PageHeader title="Document management" description="Verify documents uploaded for leads and customers. Files are stored privately; links expire after 60 seconds." />
      <Tabs base="/crm/documents" params={sp} param="status" active={status} tabs={[
        { key: "pending", label: "Pending verification", count: p.count ?? 0 }, { key: "verified", label: "Verified", count: v.count ?? 0 },
        { key: "rejected", label: "Rejected", count: r.count ?? 0 }, { key: "all", label: "All" },
      ]} />
      <FilterBar action="/crm/documents">
        <input type="hidden" name="status" value={status} />
        <AutoSubmit>
          <select name="type" defaultValue={str("type")} className={filterControl} aria-label="Document type"><option value="">All document types</option>{config.options.document_type.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="uploader" defaultValue={str("uploader")} className={filterControl} aria-label="Uploaded by"><option value="">Uploaded by anyone</option><option value="me">Uploaded by me</option>{config.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
        </AutoSubmit>
      </FilterBar>
      <div className="rounded-2xl border border-line bg-white shadow-xs">
        {(data ?? []).length ? (
          <ul className="divide-y divide-line">
            {(data ?? []).map((d) => {
              const lead = d.lead as unknown as { id: string; full_name: string; code: string } | null;
              const cust = d.customer as unknown as { id: string; full_name: string; code: string } | null;
              const app = d.application as unknown as { id: string; code: string } | null;
              const owner = cust ? { href: `/crm/customers/${cust.id}?tab=documents`, name: cust.full_name, code: cust.code } : lead ? { href: `/crm/leads/${lead.id}?tab=documents`, name: lead.full_name, code: lead.code } : null;
              return (
                <li key={d.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", d.mime_type === "application/pdf" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
                    {d.mime_type === "application/pdf" ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">{config.label("document_type", d.doc_type)} <StatusPill status={d.status} />
                      {owner && <Link href={owner.href} className="text-sm font-normal text-brand-700 hover:underline">{owner.name} <span className="font-mono text-xs">{owner.code}</span></Link>}
                      {app && <Link href={`/crm/applications/${app.id}`} className="font-mono text-xs text-muted hover:text-brand-700">{app.code}</Link>}
                    </p>
                    <p className="truncate text-xs text-muted">{d.title ? `${d.title} · ` : ""}{d.file_name} · {bytes(d.size_bytes)} · {fmtDateTime(d.created_at)} by {config.staffName(d.uploaded_by)}</p>
                    {d.remarks && <p className="mt-1 text-xs text-red-700">Remark: {d.remarks}</p>}
                  </div>
                  <DocumentActions id={d.id} status={d.status} canVerify={canVerify} canDelete={can(viewer, "documents.delete")} />
                </li>
              );
            })}
          </ul>
        ) : <Empty title={status === "pending" ? "Nothing waiting for verification" : "No documents"} description="Upload documents from a lead, customer or application page." />}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total ?? 0} base="/crm/documents" params={sp} />
    </>
  );
}
