import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { DocumentReviewRow, type ReviewableDocument } from "@/components/app/document-review";
import { StatusBadge } from "@/components/app/status-badge";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Card } from "@/components/ui/primitives";
import { createTravelRequirement, requestDocument, updateApplication } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { SERVICE_BY_SLUG } from "@/lib/content/visa-services";
import { APPLICATION_STATUSES, DOCUMENT_TYPES } from "@/lib/immigration/status";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Application" };

export default async function AdminApplicationPage({ params }: PageProps<"/admin/applications/[code]">) {
  const viewer = await requireSection("applications");
  const { code } = await params;
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("*, customer:profiles!applications_user_id_fkey(full_name, email, mobile), counsellor:profiles!applications_counsellor_id_fkey(full_name), leads(id, code)")
    .eq("code", code)
    .maybeSingle();
  if (!app) notFound();

  const [{ data: documents }, { data: events }, { data: travel }] = await Promise.all([
    supabase.from("documents").select("id, doc_type, label, status, updated_at, storage_path, document_remarks(body, created_at)").eq("application_id", app.id).order("created_at"),
    supabase.from("application_events").select("id, title, body, status, visible_to_customer, created_at, actor:profiles!application_events_actor_id_fkey(full_name)").eq("application_id", app.id).order("created_at", { ascending: false }),
    supabase.from("travel_requirements").select("id, origin, destination, depart_on, return_on, needs_hotel, notes, created_at").eq("application_id", app.id),
  ]);
  const customer = app.customer as unknown as { full_name: string; email: string; mobile: string | null };
  const lead = app.leads as unknown as { id: string; code: string } | null;
  const canReview = canAccess(viewer.role, "documents");

  return (
    <>
      <PageHeader
        title={`${app.code} · ${customer.full_name}`}
        description={<>{COUNTRY_BY_SLUG.get(app.destination_country)?.name}{app.visa_service_slug && ` · ${SERVICE_BY_SLUG.get(app.visa_service_slug)?.title}`} · Counsellor: {(app.counsellor as unknown as { full_name: string } | null)?.full_name ?? "Unassigned"}{lead && <> · Lead <Link href={`/admin/leads/${lead.id}`} className="text-brand-600">{lead.code}</Link></>}</>}
        actions={<StatusBadge status={app.status} />}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="grid gap-3 p-5 text-sm sm:grid-cols-3">
            <div><p className="text-muted">Email</p>{customer.email}</div>
            <div><p className="text-muted">Mobile</p>{customer.mobile ?? "—"}</div>
            <div><p className="text-muted">Opened</p>{formatDate(app.created_at)}</div>
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">Documents</h2>
            <Card className="divide-y divide-line">
              {(documents as ReviewableDocument[] | null)?.map((d) => <DocumentReviewRow key={d.id} doc={d} canReview={canReview} />)}
              {!documents?.length && <p className="p-4 text-sm text-muted">No documents yet.</p>}
              <div className="p-4">
                <p className="mb-2 text-sm font-medium">Request a document</p>
                <ActionForm action={requestDocument} submitLabel="Request" className="grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="applicationId" value={app.id} />
                  <Select name="docType" defaultValue="passport" aria-label="Document type">{DOCUMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select>
                  <Input name="label" placeholder="Custom label (optional)" aria-label="Label" />
                  <Textarea name="note" rows={2} placeholder="Instructions for the customer (optional)" className="sm:col-span-2" aria-label="Instructions" />
                </ActionForm>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Timeline / history</h2>
            <Card className="divide-y divide-line">
              {(events ?? []).map((e) => (
                <div key={e.id} className="p-3 text-sm">
                  <div className="flex justify-between gap-2"><p className="font-medium">{e.title}</p><time className="text-xs text-muted">{formatDate(e.created_at, { dateStyle: "medium", timeStyle: "short" })}</time></div>
                  {e.body && <p className="text-ink-soft">{e.body}</p>}
                  <p className="text-xs text-muted">{(e.actor as unknown as { full_name: string } | null)?.full_name ?? "System"}{!e.visible_to_customer && " · internal"}</p>
                </div>
              ))}
              {!events?.length && <p className="p-4 text-sm text-muted">No history yet.</p>}
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Update application</h2>
            <ActionForm action={updateApplication} submitLabel="Save & notify">
              <input type="hidden" name="applicationId" value={app.id} />
              <Field label="Status" htmlFor="status"><Select id="status" name="status" defaultValue={app.status}>{APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></Field>
              <Field label="Next action (shown to customer)" htmlFor="nextAction"><Input id="nextAction" name="nextAction" defaultValue={app.next_action ?? ""} /></Field>
              <Field label="Counsellor remarks (shown to customer)" htmlFor="counsellorRemarks"><Textarea id="counsellorRemarks" name="counsellorRemarks" rows={2} defaultValue={app.counsellor_remarks ?? ""} /></Field>
              <Field label="Important update title (optional)" htmlFor="updateTitle"><Input id="updateTitle" name="updateTitle" /></Field>
              <Field label="Update details" htmlFor="updateBody"><Textarea id="updateBody" name="updateBody" rows={2} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="readyToTravel" defaultChecked={app.ready_to_travel} className="accent-brand-600" /> Ready to travel (show booking prompt)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notifyCustomer" defaultChecked className="accent-brand-600" /> Notify customer</label>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Travel requirement</h2>
            {(travel ?? []).map((t) => (
              <p key={t.id} className="mb-2 rounded bg-canvas p-2 text-xs">{t.origin ?? "?"} → {t.destination ?? "?"} · {t.depart_on ?? "date TBC"}{t.return_on && ` – ${t.return_on}`}{t.needs_hotel && " · hotel needed"}{t.notes && <><br />{t.notes}</>}</p>
            ))}
            <ActionForm action={createTravelRequirement} submitLabel="Add requirement" className="grid gap-2">
              <input type="hidden" name="applicationId" value={app.id} />
              <div className="grid grid-cols-2 gap-2">
                <Input name="origin" placeholder="From (e.g. DEL)" aria-label="Origin" />
                <Input name="destination" placeholder="To (e.g. YYZ)" aria-label="Destination" />
                <Input name="departOn" type="date" aria-label="Depart on" />
                <Input name="returnOn" type="date" aria-label="Return on" />
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="needsHotel" className="accent-brand-600" /> Needs hotel</label>
              <Textarea name="notes" rows={2} placeholder="Notes" aria-label="Notes" />
            </ActionForm>
          </Card>
        </aside>
      </div>
    </>
  );
}
