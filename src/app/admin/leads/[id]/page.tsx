import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Card } from "@/components/ui/primitives";
import { convertLeadToApplication, updateLead } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { servicesForCountry } from "@/lib/content/visa-services";
import { LEAD_STATUSES } from "@/lib/immigration/status";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize, toBusinessInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };


export default async function LeadDetailPage({ params }: PageProps<"/admin/leads/[id]">) {
  const viewer = await requireSection("leads");
  const { id } = await params;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();

  const canAssign = viewer.role === "super_admin" || viewer.role === "immigration_admin";
  const [{ data: activities }, { data: counsellors }, { data: apps }] = await Promise.all([
    supabase.from("lead_activities").select("id, kind, body, created_at, actor:profiles!lead_activities_actor_id_fkey(full_name)").eq("lead_id", id).order("created_at", { ascending: false }),
    canAssign ? supabase.from("profiles").select("id, full_name").eq("role", "counsellor").eq("is_active", true).order("full_name") : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("applications").select("code, status").eq("lead_id", id),
  ]);

  const assessment = lead.assessment as Record<string, Record<string, unknown>>;
  const services = servicesForCountry(lead.destination_country ?? "");

  return (
    <>
      <PageHeader
        title={lead.full_name}
        description={<><span className="font-mono">{lead.code}</span> · {humanize(lead.source)} · created {formatDate(lead.created_at)}</>}
        actions={<><StatusBadge status={lead.status} /><StatusBadge status={lead.eligibility_status} /></>}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="grid gap-3 p-5 text-sm sm:grid-cols-3">
            <div><p className="text-muted">Email</p><a href={`mailto:${lead.email}`} className="text-brand-600">{lead.email}</a></div>
            <div><p className="text-muted">Mobile</p><a href={`tel:${lead.mobile}`} className="text-brand-600">{lead.mobile}</a></div>
            <div><p className="text-muted">Residence</p>{lead.country_of_residence ?? "—"}</div>
            <div><p className="text-muted">Destination</p>{COUNTRY_BY_SLUG.get(lead.destination_country ?? "")?.name ?? "—"}</div>
            <div><p className="text-muted">Visa type</p>{lead.visa_type ? humanize(lead.visa_type) : "—"}</div>
            <div><p className="text-muted">Indicative score</p>{lead.eligibility_score ?? "—"}</div>
            <div><p className="text-muted">Last contacted</p>{lead.last_contacted_at ? formatDate(lead.last_contacted_at) : "Never"}</div>
          </Card>

          {assessment && Object.keys(assessment).length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold">Assessment answers</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {Object.entries(assessment).filter(([k]) => k !== "consent").map(([section, values]) => (
                  <div key={section}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{humanize(section)}</p>
                    {typeof values === "object" && values !== null ? (
                      <dl className="mt-1 text-sm">
                        {Object.entries(values).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 py-0.5"><dt className="text-ink-soft">{humanize(k)}</dt><dd className="text-right">{String(v)}</dd></div>
                        ))}
                      </dl>
                    ) : <p className="mt-1 text-sm">{String(values)}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <section>
            <h2 className="mb-3 font-semibold">Activity & follow-ups</h2>
            <Card className="divide-y divide-line">
              {(activities ?? []).map((a) => (
                <div key={a.id} className="p-3 text-sm">
                  <div className="flex justify-between gap-2"><p className="font-medium">{humanize(a.kind)}</p><time className="text-xs text-muted">{formatDate(a.created_at, { dateStyle: "medium", timeStyle: "short" })}</time></div>
                  {a.body && <p className="text-ink-soft">{a.body}</p>}
                  <p className="text-xs text-muted">{(a.actor as unknown as { full_name: string } | null)?.full_name ?? "System"}</p>
                </div>
              ))}
              {!activities?.length && <p className="p-4 text-sm text-muted">No activity yet.</p>}
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Update lead</h2>
            <ActionForm action={updateLead} submitLabel="Save">
              <input type="hidden" name="leadId" value={lead.id} />
              <Field label="Status" htmlFor="status"><Select id="status" name="status" defaultValue={lead.status}>{LEAD_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select></Field>
              <Field label="Priority" htmlFor="priority"><Select id="priority" name="priority" defaultValue={lead.priority}>{["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</Select></Field>
              {canAssign && (
                <Field label="Assigned counsellor" htmlFor="assignedCounsellorId">
                  <Select id="assignedCounsellorId" name="assignedCounsellorId" defaultValue={lead.assigned_counsellor_id ?? ""}>
                    <option value="">Unassigned</option>
                    {(counsellors ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Next follow-up (IST)" htmlFor="nextFollowUpAt"><Input id="nextFollowUpAt" name="nextFollowUpAt" type="datetime-local" defaultValue={toBusinessInput(lead.next_follow_up_at)} /></Field>
              <Field label="Note / call log" htmlFor="note"><Textarea id="note" name="note" rows={3} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="contacted" className="accent-brand-600" /> Mark as contacted now</label>
            </ActionForm>
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 font-semibold">Application</h2>
            {apps?.length ? (
              <ul className="space-y-1 text-sm">{apps.map((a) => <li key={a.code}><a href={`/admin/applications/${a.code}`} className="font-mono text-brand-600">{a.code}</a> <StatusBadge status={a.status} /></li>)}</ul>
            ) : (
              <ActionForm action={convertLeadToApplication} submitLabel="Open application" variant="accent">
                <input type="hidden" name="leadId" value={lead.id} />
                <Field label="Visa service" htmlFor="visaServiceSlug">
                  <Select id="visaServiceSlug" name="visaServiceSlug" defaultValue="">
                    <option value="">Not decided</option>
                    {services.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                  </Select>
                </Field>
              </ActionForm>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
