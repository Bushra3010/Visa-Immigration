import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageCircle, Pencil, Phone, Trash2 } from "lucide-react";
import { KV, PageHeader, Panel, StatusPill, Tabs, TintBadge } from "@/components/crm/blocks";
import { ConfirmButton } from "@/components/crm/interactive";
import { AssignLead, ConvertLead, StagePath } from "@/components/crm/lead-controls";
import { ActivityForm, DocumentUpload, FollowUpForm } from "@/components/crm/record-actions";
import { ActivityFeed, DocumentList, FollowUpList, HistoryTimeline, staffOptions, type ActivityView, type DocumentView, type FollowUpView, type HistoryView } from "@/components/crm/records";
import { buttonClass } from "@/components/ui/button";
import { deleteLead } from "@/lib/crm/actions/leads";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { fmtDate, fmtDateTime, relativeTime, titleCase } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadDetailPage({ params, searchParams }: PageProps<"/crm/leads/[id]">) {
  const viewer = await requireCrm("leads.view");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const config = await getCrmConfig();

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const [activities, followUps, docs, history, customer] = await Promise.all([
    supabase.from("lead_activities").select("id, kind, body, metadata, actor_id, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("crm_follow_ups").select("id, title, type, notes, due_at, status, outcome, assigned_to, completed_at, created_by").eq("lead_id", id).order("due_at", { ascending: false }),
    can(viewer, "documents.view")
      ? supabase.from("crm_documents").select("id, doc_type, title, file_name, mime_type, size_bytes, status, remarks, uploaded_by, created_at, verified_by, verified_at, application:crm_applications(id, code)").eq("lead_id", id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("crm_lead_history").select("id, event, actor_id, from_stage_id, to_stage_id, changes, note, created_at").eq("lead_id", id).order("created_at", { ascending: false }).limit(200),
    lead.converted_at ? supabase.from("crm_customers").select("id, code").eq("lead_id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const tab = typeof sp.tab === "string" ? sp.tab : "overview";
  const stage = lead.stage_id ? config.stageById.get(lead.stage_id) : null;
  const staff = staffOptions(config);
  const opts = (kind: "visa_category" | "destination_country" | "document_type") => config.options[kind].filter((o) => o.is_active).map((o) => ({ value: o.key, label: o.label }));
  const pendingFollowUps = (followUps.data ?? []).filter((f) => f.status === "pending").length;
  const wa = (lead.whatsapp || lead.mobile)?.replace(/\D/g, "");
  const cf = config.customFields.filter((f) => f.entity === "lead");
  const canEdit = can(viewer, "leads.edit");

  return (
    <>
      <PageHeader
        back={{ href: "/crm/leads", label: "Leads" }}
        title={<span className="flex flex-wrap items-center gap-2">{lead.full_name}<StatusPill status={lead.temperature} />{stage && <TintBadge color={stage.color}>{stage.name}</TintBadge>}</span>}
        description={<span className="font-mono">{lead.code}{customer.data && <> · <Link className="font-sans font-medium text-success hover:underline" href={`/crm/customers/${customer.data.id}`}>Customer {customer.data.code} →</Link></>}</span>}
        actions={<>
          <a href={`tel:${lead.mobile}`} className={buttonClass("secondary", "sm")}><Phone className="size-4" />Call</a>
          {wa && <a href={`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="size-4" />WhatsApp</a>}
          {lead.email && <a href={`mailto:${lead.email}`} className={buttonClass("secondary", "sm")}><Mail className="size-4" />Email</a>}
          {canEdit && <Link href={`/crm/leads/${id}/edit`} className={buttonClass("secondary", "sm")}><Pencil className="size-4" />Edit</Link>}
          {!lead.converted_at && can(viewer, "customers.create") && canEdit && (
            <ConvertLead leadId={id} currency={config.currency} staff={staff} visas={opts("visa_category")} countries={opts("destination_country")} canCreateApp={can(viewer, "applications.create")}
              defaults={{ consultant: lead.assigned_counsellor_id, visa: lead.visa_type, country: lead.destination_country }} />
          )}
          {can(viewer, "leads.delete") && !lead.converted_at && (
            <ConfirmButton action={deleteLead} fields={{ id }} title="Delete this lead?" message={<>This permanently deletes <b>{lead.full_name}</b> ({lead.code}) with its notes, follow-ups and documents. The deletion is recorded in the audit log.</>} confirmLabel="Delete lead" requireReason="Reason for deleting (required)">
              <Trash2 className="size-4" />Delete
            </ConfirmButton>
          )}
        </>}
      />

      <div className="mb-5">
        <StagePath leadId={id} currentId={lead.stage_id} canEdit={canEdit && (can(viewer, "pipeline.edit") || canEdit)} converted={!!lead.converted_at}
          stages={config.stages.filter((s) => s.is_active || s.id === lead.stage_id).map((s) => ({ id: s.id, name: s.name, color: s.color, is_won: s.is_won, is_lost: s.is_lost }))} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <Tabs base={`/crm/leads/${id}`} params={sp} active={tab} tabs={[
            { key: "overview", label: "Overview" },
            { key: "activity", label: "Communication", count: activities.data?.length ?? 0 },
            { key: "followups", label: "Follow-ups", count: pendingFollowUps },
            ...(can(viewer, "documents.view") ? [{ key: "documents", label: "Documents", count: docs.data?.length ?? 0 }] : []),
            { key: "history", label: "History" },
          ]} />

          {tab === "overview" && (
            <div className="space-y-4">
              <Panel title="Personal information">
                <KV items={[
                  { label: "Full name", value: lead.full_name }, { label: "Mobile", value: <a href={`tel:${lead.mobile}`} className="text-brand-700">{lead.mobile}</a> },
                  { label: "WhatsApp", value: lead.whatsapp }, { label: "Email", value: lead.email && <a href={`mailto:${lead.email}`} className="text-brand-700">{lead.email}</a> },
                  { label: "Date of birth", value: lead.date_of_birth && fmtDate(lead.date_of_birth) }, { label: "Gender", value: lead.gender && titleCase(lead.gender) },
                  { label: "Nationality", value: lead.nationality }, { label: "Current city", value: lead.current_city }, { label: "Current country", value: lead.current_country ?? lead.country_of_residence },
                ]} />
              </Panel>
              <Panel title="Visa information">
                <KV items={[
                  { label: "Visa type", value: config.label("visa_category", lead.visa_type) }, { label: "Interested country", value: config.label("destination_country", lead.destination_country) },
                  { label: "Preferred travel date", value: lead.preferred_travel_date && fmtDate(lead.preferred_travel_date) },
                  { label: "Purpose of travel", value: lead.purpose_of_travel },
                  { label: "Passport available", value: lead.passport_available === null ? null : lead.passport_available ? "Yes" : "No" },
                  { label: "Passport number", value: lead.passport_number && <span className="font-mono">{lead.passport_number}</span> },
                  { label: "Passport expiry", value: lead.passport_expiry && fmtDate(lead.passport_expiry) },
                ]} />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[["Previous visa history", lead.previous_visa_history], ["Visa rejection history", lead.visa_rejection_history], ["Education / employment", lead.education_employment], ["Additional requirements", lead.additional_requirements]].map(([label, value]) => (
                    <div key={label}><p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p><p className="mt-0.5 whitespace-pre-line text-sm">{value || <span className="text-muted">—</span>}</p></div>
                  ))}
                </div>
              </Panel>
              {(cf.length > 0 || Object.keys(lead.assessment ?? {}).length > 0) && (
                <Panel title="Additional details">
                  {cf.length > 0 && <KV items={cf.map((f) => ({ label: f.label, value: (() => { const v = (lead.custom_fields ?? {})[f.key]; return v === true ? "Yes" : v === false ? "No" : v === undefined ? null : String(v); })() }))} />}
                  {lead.eligibility_score !== null && <p className="mt-3 text-sm text-ink-soft">Website eligibility score: <b>{lead.eligibility_score}</b> ({titleCase(lead.eligibility_status)})</p>}
                </Panel>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-4">
              {canEdit && <Panel title="Log communication"><ActivityForm leadId={id} /></Panel>}
              <ActivityFeed items={(activities.data ?? []) as ActivityView[]} config={config} />
            </div>
          )}

          {tab === "followups" && (
            <div className="space-y-4">
              {canEdit && <Panel title="Schedule a follow-up"><FollowUpForm leadId={id} staff={staff} canAssign={can(viewer, "leads.assign")} viewerId={viewer.id} defaultTitle={`Call ${lead.full_name}`} /></Panel>}
              <Panel title="Follow-up history" bodyClassName="px-4 py-1 sm:px-5"><FollowUpList items={(followUps.data ?? []) as FollowUpView[]} config={config} viewer={viewer} /></Panel>
            </div>
          )}

          {tab === "documents" && can(viewer, "documents.view") && (
            <Panel title="Documents" action={can(viewer, "documents.create") && <DocumentUpload leadId={id} customerId={customer.data?.id} docTypes={opts("document_type")} />} bodyClassName="px-4 py-1 sm:px-5">
              <DocumentList docs={(docs.data ?? []) as unknown as DocumentView[]} config={config} viewer={viewer} />
            </Panel>
          )}

          {tab === "history" && <HistoryTimeline items={(history.data ?? []) as HistoryView[]} config={config} />}
        </div>

        <aside className="space-y-4">
          <Panel title="Lead summary">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted">Assigned to</dt>
                <dd className="text-right font-medium">{config.staffName(lead.assigned_counsellor_id)}<br />
                  {(can(viewer, "leads.assign") || can(viewer, "leads.reassign")) && <AssignLead leadId={id} current={lead.assigned_counsellor_id} staff={staff} canReassign={can(viewer, "leads.reassign")} />}
                </dd>
              </div>
              <Row label="Lead source" value={config.label("lead_source", lead.source)} />
              <Row label="Campaign" value={lead.campaign_name} />
              <Row label="Reference" value={lead.reference} />
              <Row label="Next follow-up" value={lead.next_follow_up_at ? <span className={new Date(lead.next_follow_up_at) < new Date() ? "font-semibold text-danger" : ""}>{fmtDateTime(lead.next_follow_up_at)}<br /><span className="text-xs font-normal text-muted">{relativeTime(lead.next_follow_up_at)}</span></span> : null} />
              <Row label="Last contacted" value={lead.last_contacted_at ? relativeTime(lead.last_contacted_at) : "Never"} />
              <Row label="Created" value={fmtDateTime(lead.created_at)} />
              <Row label="Created by" value={lead.created_by ? config.staffName(lead.created_by) : "Website"} />
              <Row label="In stage since" value={lead.stage_changed_at ? relativeTime(lead.stage_changed_at) : null} />
              {lead.lost_reason && <Row label="Lost reason" value={lead.lost_reason} />}
              {lead.converted_at && <Row label="Converted" value={fmtDate(lead.converted_at)} />}
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value === null || value === undefined || value === "" ? <span className="font-normal text-muted">—</span> : value}</dd>
    </div>
  );
}
