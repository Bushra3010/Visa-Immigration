import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationTimeline } from "@/components/app/application-timeline";
import { PageHeader } from "@/components/app/app-shell";
import { DocumentUpload } from "@/components/app/document-upload";
import { StatusBadge } from "@/components/app/status-badge";
import { ViewDocumentButton } from "@/components/app/view-document-button";
import { buttonClass } from "@/components/ui/button";
import { Card, Notice } from "@/components/ui/primitives";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { SERVICE_BY_SLUG } from "@/lib/content/visa-services";
import { DOCUMENT_TYPE_LABEL, type ApplicationStatus } from "@/lib/immigration/status";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Application details" };

export default async function ApplicationDetailPage({ params }: PageProps<"/dashboard/applications/[code]">) {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const { code } = await params;
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select("id, code, destination_country, visa_service_slug, status, next_action, counsellor_remarks, ready_to_travel, created_at, counsellor:profiles!applications_counsellor_id_fkey(full_name, email)")
    .eq("code", code)
    .maybeSingle();
  if (!app) notFound();

  const [{ data: events }, { data: documents }] = await Promise.all([
    supabase.from("application_events").select("id, title, body, status, created_at").eq("application_id", app.id).order("created_at", { ascending: false }),
    supabase.from("documents").select("id, doc_type, label, status, updated_at, document_remarks(body, created_at)").eq("application_id", app.id).order("created_at"),
  ]);

  const counsellor = app.counsellor as unknown as { full_name: string; email: string } | null;
  const service = app.visa_service_slug ? SERVICE_BY_SLUG.get(app.visa_service_slug) : null;
  const pending = (documents ?? []).filter((d) => ["requested", "reupload_required", "rejected"].includes(d.status));

  return (
    <>
      <PageHeader
        title={`${COUNTRY_BY_SLUG.get(app.destination_country)?.name ?? app.destination_country}${service ? ` · ${service.title}` : ""}`}
        description={<>Application <span className="font-mono">{app.code}</span> · opened {formatDate(app.created_at)}</>}
        actions={<StatusBadge status={app.status} />}
      />

      {(app.ready_to_travel || app.status === "approved") && (
        <Notice tone="success" className="mb-6">
          <p className="font-semibold">Your visa process is complete. Plan your journey</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={`/flights?application=${app.id}`} className={buttonClass("accent", "sm")}>Book flight</Link>
            <Link href={`/hotels?application=${app.id}`} className={buttonClass("secondary", "sm")}>Book hotel</Link>
            <Link href="/flight-hotel" className={buttonClass("ghost", "sm")}>View travel options</Link>
          </div>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {app.next_action && (
            <Card className="border-accent-500/40 bg-accent-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">Next action</p>
              <p className="mt-1 font-medium">{app.next_action}</p>
            </Card>
          )}
          {app.counsellor_remarks && (
            <Card className="p-4"><p className="text-sm font-semibold">Counsellor remarks</p><p className="mt-1 text-sm text-ink-soft">{app.counsellor_remarks}</p></Card>
          )}

          <section>
            <h2 className="mb-3 font-semibold">Documents {pending.length > 0 && <span className="text-sm font-normal text-warning">· {pending.length} pending</span>}</h2>
            <Card className="divide-y divide-line">
              {(documents ?? []).map((d) => {
                const remarks = (d.document_remarks as { body: string; created_at: string }[]) ?? [];
                const needsUpload = ["requested", "reupload_required", "rejected"].includes(d.status);
                return (
                  <div key={d.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{d.label ?? DOCUMENT_TYPE_LABEL.get(d.doc_type) ?? d.doc_type}</p>
                      <div className="flex items-center gap-3">{!needsUpload && <ViewDocumentButton documentId={d.id} />}<StatusBadge status={d.status} /></div>
                    </div>
                    {remarks.map((r, i) => <p key={i} className="rounded-md bg-canvas px-3 py-2 text-sm text-ink-soft">{r.body}</p>)}
                    {needsUpload && <DocumentUpload documentId={d.id} compact />}
                  </div>
                );
              })}
              <div className="p-4">
                <p className="mb-2 text-sm font-medium">Upload an additional document</p>
                <DocumentUpload applicationId={app.id} />
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Updates</h2>
            {events?.length ? (
              <ol className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="rounded-xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between gap-2"><p className="font-medium">{e.title}</p><time className="text-xs text-muted">{formatDate(e.created_at, { dateStyle: "medium", timeStyle: "short" })}</time></div>
                    {e.body && <p className="mt-1 text-sm text-ink-soft">{e.body}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted">No updates yet.</p>}
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <p className="text-sm font-semibold">Your counsellor</p>
            {counsellor ? (<><p className="mt-1">{counsellor.full_name}</p><Link href="/dashboard/messages" className="mt-2 inline-block text-sm text-brand-600">Send a message →</Link></>) : <p className="mt-1 text-sm text-muted">Being assigned</p>}
          </Card>
          <Card className="p-4">
            <p className="mb-4 text-sm font-semibold">Progress</p>
            <ApplicationTimeline status={app.status as ApplicationStatus} />
          </Card>
        </aside>
      </div>
    </>
  );
}
