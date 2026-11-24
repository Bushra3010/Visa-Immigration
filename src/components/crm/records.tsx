import Link from "next/link";
import { ArrowRight, CalendarCheck, FileText, Image as ImageIcon, Mail, MessageCircle, MessageSquareText, Phone, StickyNote, UserCheck, Users2 } from "lucide-react";
import { can, type CrmViewer } from "@/lib/crm/auth";
import { assignableStaff, type CrmConfig } from "@/lib/crm/config";
import { nowMs } from "@/lib/crm/dates";
import { bytes, fmtDate, fmtDateTime, relativeTime, titleCase } from "@/lib/crm/format";
import { cn } from "@/lib/utils";
import { Empty, StatusPill, TintBadge } from "./blocks";
import { DocumentActions, FollowUpActions } from "./record-actions";

export type FollowUpView = {
  id: string; title: string; type: string; notes: string | null; due_at: string; status: string; outcome: string | null; assigned_to: string;
  completed_at: string | null; created_by: string | null;
  lead?: { id: string; full_name: string; code: string } | null; customer?: { id: string; full_name: string; code: string } | null;
};

export function staffOptions(config: CrmConfig) {
  return assignableStaff(config).map((s) => ({ value: s.id, label: s.full_name ?? s.email ?? "" }));
}

export function FollowUpList({ items, config, viewer, showTarget = false }: { items: FollowUpView[]; config: CrmConfig; viewer: CrmViewer; showTarget?: boolean }) {
  if (!items.length) return <Empty title="No follow-ups" description="Schedule calls, meetings and tasks so nothing slips." icon={<CalendarCheck className="size-6" />} />;
  const now = nowMs();
  const staff = staffOptions(config);
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => {
        const overdue = f.status === "pending" && new Date(f.due_at).getTime() < now;
        const target = f.lead ? { href: `/crm/leads/${f.lead.id}`, name: f.lead.full_name, code: f.lead.code } : f.customer ? { href: `/crm/customers/${f.customer.id}`, name: f.customer.full_name, code: f.customer.code } : null;
        return (
          <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={overdue ? "overdue" : f.status} />
                <span className="rounded bg-canvas px-1.5 py-0.5 text-[11px] font-medium uppercase text-muted">{f.type}</span>
                <p className="font-medium text-ink">{f.title}</p>
              </div>
              <p className={cn("mt-1 text-xs", overdue ? "font-semibold text-danger" : "text-muted")}>
                {fmtDateTime(f.due_at)} · {relativeTime(f.due_at)} · {config.staffName(f.assigned_to)}
                {showTarget && target && <> · <Link href={target.href} className="font-medium text-brand-700 hover:underline">{target.name}</Link> <span className="font-mono">{target.code}</span></>}
              </p>
              {f.notes && <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{f.notes}</p>}
              {f.outcome && <p className="mt-1 text-sm text-ink-soft"><span className="font-medium text-success">Outcome:</span> {f.outcome}</p>}
            </div>
            <FollowUpActions id={f.id} status={f.status} staff={staff} canAssign={can(viewer, "leads.assign")}
              canDelete={f.created_by === viewer.id || can(viewer, f.lead ? "leads.delete" : "customers.delete")} />
          </li>
        );
      })}
    </ul>
  );
}

export type DocumentView = {
  id: string; doc_type: string; title: string | null; file_name: string; mime_type: string; size_bytes: number; status: string;
  remarks: string | null; uploaded_by: string | null; created_at: string; verified_by: string | null; verified_at: string | null;
  application?: { id: string; code: string } | null;
};

export function DocumentList({ docs, config, viewer }: { docs: DocumentView[]; config: CrmConfig; viewer: CrmViewer }) {
  if (!docs.length) return <Empty title="No documents yet" description="Upload passport, photos, bank statements and other files here." icon={<FileText className="size-6" />} />;
  const canVerify = can(viewer, "documents.approve") || can(viewer, "documents.edit");
  return (
    <ul className="divide-y divide-line">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", d.mime_type === "application/pdf" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600")}>
            {d.mime_type === "application/pdf" ? <FileText className="size-5" /> : <ImageIcon className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{config.label("document_type", d.doc_type)}</p>
              <StatusPill status={d.status} />
              {d.application && <Link href={`/crm/applications/${d.application.id}`} className="font-mono text-xs text-brand-700">{d.application.code}</Link>}
            </div>
            <p className="truncate text-xs text-muted">{d.title ? `${d.title} · ` : ""}{d.file_name} · {bytes(d.size_bytes)} · uploaded {fmtDateTime(d.created_at)} by {config.staffName(d.uploaded_by)}</p>
            {d.verified_at && <p className="text-xs text-muted">{d.status === "verified" ? "Verified" : "Reviewed"} by {config.staffName(d.verified_by)} on {fmtDate(d.verified_at)}</p>}
            {d.remarks && <p className={cn("mt-1 rounded-lg px-2 py-1 text-xs", d.status === "rejected" ? "bg-red-50 text-red-800" : "bg-canvas text-ink-soft")}>Remark: {d.remarks}</p>}
          </div>
          <DocumentActions id={d.id} status={d.status} canVerify={canVerify} canDelete={can(viewer, "documents.delete")} />
        </li>
      ))}
    </ul>
  );
}

export type ActivityView = { id: string; kind: string; body: string | null; metadata: Record<string, unknown> | null; actor_id: string | null; created_at: string };

const ACTIVITY_ICON: Record<string, typeof Phone> = { call: Phone, whatsapp: MessageCircle, email: Mail, note: StickyNote, comment: MessageSquareText, meeting: Users2, assignment: UserCheck };

export function ActivityFeed({ items, config }: { items: ActivityView[]; config: CrmConfig }) {
  if (!items.length) return <Empty title="No communication logged yet" description="Log calls, WhatsApp messages, notes and internal comments." />;
  return (
    <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-line">
      {items.map((a) => {
        const Icon = ACTIVITY_ICON[a.kind] ?? StickyNote;
        const m = a.metadata ?? {};
        return (
          <li key={a.id} className="relative flex gap-3">
            <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-white",
              a.kind === "whatsapp" ? "bg-green-100 text-green-700" : a.kind === "call" ? "bg-blue-100 text-blue-700" : a.kind === "comment" ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700")}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2">
              <p className="text-xs text-muted">
                <span className="font-semibold text-ink">{a.actor_id ? config.staffName(a.actor_id) : "System"}</span> · {titleCase(a.kind)}
                {typeof m.direction === "string" && ` · ${m.direction === "inbound" ? "Incoming" : "Outgoing"}`}
                {typeof m.outcome === "string" && ` · ${titleCase(m.outcome)}`}
                {typeof m.duration_minutes === "number" && ` · ${m.duration_minutes} min`}
                <span className="float-right" title={fmtDateTime(a.created_at)}>{relativeTime(a.created_at)}</span>
              </p>
              {a.body && <p className="mt-1 whitespace-pre-line text-sm text-ink">{a.body}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type HistoryView = { id: string; event: string; actor_id: string | null; from_stage_id: string | null; to_stage_id: string | null; changes: Record<string, { from: unknown; to: unknown }> | Record<string, unknown> | null; note: string | null; created_at: string };

const FIELD_LABELS: Record<string, string> = {
  full_name: "Name", mobile: "Mobile", whatsapp: "WhatsApp", email: "Email", temperature: "Priority", source: "Source", visa_type: "Visa type",
  destination_country: "Interested country", assigned_counsellor_id: "Assigned employee", passport_number: "Passport number", custom_fields: "Custom fields",
};

function show(v: unknown, key: string, config: CrmConfig) {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "assigned_counsellor_id" || key === "to" || key === "from") return config.staffName(String(v));
  if (typeof v === "object") return "updated";
  return String(v);
}

export function HistoryTimeline({ items, config }: { items: HistoryView[]; config: CrmConfig }) {
  if (!items.length) return <Empty title="No history yet" />;
  return (
    <ol className="space-y-3">
      {items.map((h) => {
        const from = h.from_stage_id ? config.stageById.get(h.from_stage_id) : null;
        const to = h.to_stage_id ? config.stageById.get(h.to_stage_id) : null;
        return (
          <li key={h.id} className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
            <p className="text-xs text-muted"><span className="font-semibold text-ink">{h.actor_id ? config.staffName(h.actor_id) : "System / website"}</span> · {fmtDateTime(h.created_at)}</p>
            {h.event === "stage_changed" && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5">Stage changed {from && <TintBadge color={from.color}>{from.name}</TintBadge>}<ArrowRight className="size-3.5 text-muted" />{to ? <TintBadge color={to.color}>{to.name}</TintBadge> : "—"}</p>
            )}
            {h.event === "created" && <p className="mt-1">{h.note ?? "Lead created"}{to && <> in <TintBadge color={to.color}>{to.name}</TintBadge></>}</p>}
            {h.event === "assigned" && h.changes && <p className="mt-1">Assigned from <b>{show((h.changes as Record<string, unknown>).from, "from", config)}</b> to <b>{show((h.changes as Record<string, unknown>).to, "to", config)}</b></p>}
            {h.event === "converted" && <p className="mt-1 font-medium text-success">Converted to customer</p>}
            {(h.event === "follow_up" || h.event === "document") && <p className="mt-1">{h.note}</p>}
            {h.event === "updated" && h.changes && (
              <ul className="mt-1 space-y-0.5 text-xs">
                {Object.entries(h.changes as Record<string, { from: unknown; to: unknown }>).slice(0, 12).map(([k, c]) => (
                  <li key={k}><span className="font-medium">{FIELD_LABELS[k] ?? titleCase(k)}:</span> <span className="text-muted line-through">{show(c?.from, k, config)}</span> → {show(c?.to, k, config)}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
