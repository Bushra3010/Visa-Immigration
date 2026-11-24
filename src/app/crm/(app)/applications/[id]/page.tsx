import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { KV, PageHeader, Panel, Tabs, TintBadge } from "@/components/crm/blocks";
import { EditApplicationForm } from "@/components/crm/customer-forms";
import { ConfirmButton } from "@/components/crm/interactive";
import { DocumentUpload } from "@/components/crm/record-actions";
import { DocumentList, staffOptions, type DocumentView } from "@/components/crm/records";
import { deleteApplication } from "@/lib/crm/actions/customers";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { fmtDate, fmtDateTime } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Visa application" };

export default async function ApplicationPage({ params, searchParams }: PageProps<"/crm/applications/[id]">) {
  const viewer = await requireCrm("applications.view");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const config = await getCrmConfig();
  const { data: a } = await supabase.from("crm_applications").select("*, customer:crm_customers(id, code, full_name, mobile, email, lead_code)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const [history, docs] = await Promise.all([
    supabase.from("crm_application_history").select("id, from_status, to_status, note, actor_id, created_at").eq("application_id", id).order("created_at", { ascending: false }),
    can(viewer, "documents.view") ? supabase.from("crm_documents").select("id, doc_type, title, file_name, mime_type, size_bytes, status, remarks, uploaded_by, created_at, verified_by, verified_at").eq("application_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  const c = a.customer as { id: string; code: string; full_name: string; mobile: string | null; email: string | null; lead_code: string };
  const tab = typeof sp.tab === "string" ? sp.tab : can(viewer, "applications.edit") ? "edit" : "details";
  const opts = (kind: "visa_category" | "destination_country" | "application_status" | "document_type") => config.options[kind].filter((o) => o.is_active || o.key === a[kind === "visa_category" ? "visa_type" : kind === "application_status" ? "status" : "destination_country"]).map((o) => ({ value: o.key, label: o.label }));
  const statusColor = config.color("application_status", a.status);
  const statuses = config.options.application_status;
  const idx = statuses.findIndex((s) => s.key === a.status);

  return (
    <>
      <PageHeader back={{ href: `/crm/customers/${c.id}?tab=applications`, label: c.full_name }}
        title={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{a.code}</span><TintBadge color={statusColor}>{config.label("application_status", a.status)}</TintBadge></span>}
        description={<>{config.label("visa_category", a.visa_type)} · {config.label("destination_country", a.destination_country)} · <Link href={`/crm/customers/${c.id}`} className="text-brand-700 hover:underline">{c.full_name} ({c.code})</Link></>}
        actions={can(viewer, "applications.delete") && (
          <ConfirmButton action={deleteApplication} fields={{ id }} title={`Delete ${a.code}?`} message="Status history is deleted with it. Documents stay on the customer." confirmLabel="Delete" requireReason="Reason (required)"><Trash2 className="size-4" />Delete</ConfirmButton>
        )} />

      <div className="mb-5 overflow-x-auto rounded-2xl border border-line bg-white p-3 shadow-xs">
        <ol className="flex min-w-max items-center gap-1 text-xs">
          {statuses.filter((s) => !["rejected", "withdrawn"].includes(s.key) || s.key === a.status).map((s, i) => {
            const pos = statuses.findIndex((x) => x.key === s.key);
            const active = s.key === a.status;
            const done = idx >= 0 && pos < idx && !["rejected", "withdrawn"].includes(a.status);
            return (
              <li key={s.key} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="size-3 text-slate-300" />}
                <span className={`rounded-full px-2.5 py-1 font-semibold ${active ? "text-white" : done ? "bg-brand-50 text-brand-700" : "bg-canvas text-muted"}`} style={active ? { backgroundColor: s.color ?? "#1f6f3c" } : undefined}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <Tabs base={`/crm/applications/${id}`} params={sp} active={tab} tabs={[
            ...(can(viewer, "applications.edit") ? [{ key: "edit", label: "Edit application" }] : []),
            { key: "details", label: "Details" },
            ...(can(viewer, "documents.view") ? [{ key: "documents", label: "Documents", count: docs.data?.length ?? 0 }] : []),
          ]} />
          {tab === "edit" && can(viewer, "applications.edit") && (
            <EditApplicationForm values={a} statuses={opts("application_status")} visas={opts("visa_category")} countries={opts("destination_country")} staff={staffOptions(config)} customFields={config.customFields.filter((f) => f.entity === "application")} />
          )}
          {tab === "details" && (
            <div className="space-y-4">
              <Panel title="Passport"><KV items={[{ label: "Passport number", value: a.passport_number && <span className="font-mono">{a.passport_number}</span> }, { label: "Issue date", value: a.passport_issue_date && fmtDate(a.passport_issue_date) }, { label: "Expiry date", value: a.passport_expiry_date && fmtDate(a.passport_expiry_date) }, { label: "Place of issue", value: a.passport_issue_place }]} cols={4} /></Panel>
              <Panel title="Embassy"><KV items={[{ label: "Embassy / VFS", value: a.embassy_name }, { label: "City", value: a.embassy_city }, { label: "Reference", value: a.embassy_reference }]} /></Panel>
              <Panel title="Key dates"><KV cols={3} items={[
                { label: "Submitted", value: a.submission_date && fmtDate(a.submission_date) }, { label: "Appointment", value: a.appointment_at && fmtDateTime(a.appointment_at) },
                { label: "Biometrics", value: a.biometrics_date && fmtDate(a.biometrics_date) }, { label: "Interview", value: a.interview_at && fmtDateTime(a.interview_at) },
                { label: "Decision", value: a.decision_date && fmtDate(a.decision_date) }, { label: "Visa expiry", value: a.visa_expiry_date && fmtDate(a.visa_expiry_date) },
              ]} /></Panel>
              {a.notes && <Panel title="Internal notes"><p className="whitespace-pre-line text-sm">{a.notes}</p></Panel>}
            </div>
          )}
          {tab === "documents" && can(viewer, "documents.view") && (
            <Panel title="Application documents" action={can(viewer, "documents.create") && <DocumentUpload customerId={c.id} applicationId={id} docTypes={opts("document_type")} />} bodyClassName="px-4 py-1 sm:px-5">
              <DocumentList docs={(docs.data ?? []) as unknown as DocumentView[]} config={config} viewer={viewer} />
            </Panel>
          )}
        </div>
        <aside className="space-y-4">
          <Panel title="Status history" bodyClassName="p-0">
            <ol className="divide-y divide-line">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="px-4 py-3 text-sm">
                  <p className="flex flex-wrap items-center gap-1.5">
                    {h.from_status && <><TintBadge color={config.color("application_status", h.from_status)}>{config.label("application_status", h.from_status)}</TintBadge><ArrowRight className="size-3 text-muted" /></>}
                    <TintBadge color={config.color("application_status", h.to_status)}>{config.label("application_status", h.to_status)}</TintBadge>
                  </p>
                  {h.note && <p className="mt-1 text-ink-soft">{h.note}</p>}
                  <p className="mt-1 text-xs text-muted">{h.actor_id ? config.staffName(h.actor_id) : "System"} · {fmtDateTime(h.created_at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Customer">
            <p className="font-semibold">{c.full_name}</p>
            <p className="text-sm text-muted">{c.mobile}{c.email ? ` · ${c.email}` : ""}</p>
            <p className="mt-2 text-xs text-muted">Consultant: {config.staffName(a.consultant_id)}</p>
            <p className="text-xs text-muted">Created {fmtDateTime(a.created_at)} by {config.staffName(a.created_by)}</p>
          </Panel>
        </aside>
      </div>
    </>
  );
}
