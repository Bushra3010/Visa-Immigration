"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { assignLead, convertLead, moveLeadStage } from "@/lib/crm/actions/leads";
import { idleState } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { CheckboxField, SelectField, TextAreaField, TextField } from "./fields";
import { CrmForm, Modal } from "./interactive";
import { useToast } from "./toast";

type Opt = { value: string; label: string };
type StageOpt = { id: string; name: string; color: string; is_won: boolean; is_lost: boolean };

/** Clickable stage path (desktop) + select (mobile). Moving to a won stage opens the conversion flow instead. */
export function StagePath({ leadId, currentId, stages, canEdit, converted, onConvertHint }: {
  leadId: string; currentId: string | null; stages: StageOpt[]; canEdit: boolean; converted: boolean; onConvertHint?: string;
}) {
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  const [lostFor, setLostFor] = useState<StageOpt | null>(null);
  const [reason, setReason] = useState("");
  const toast = useToast();
  const router = useRouter();
  const idx = stages.findIndex((s) => s.id === currentId);

  function move(stage: StageOpt, lostReason?: string) {
    if (!canEdit || stage.id === currentId) return;
    if (stage.is_won && !converted) { toast(onConvertHint ?? "Use “Convert to customer” to mark this lead as won.", "info"); document.getElementById("convert-trigger")?.click(); return; }
    if (stage.is_lost && lostReason === undefined) { setLostFor(stage); return; }
    const fd = new FormData();
    fd.set("leadId", leadId);
    fd.set("stageId", stage.id);
    if (lostReason) fd.set("lostReason", lostReason);
    setTarget(stage.id);
    start(async () => {
      const res = await moveLeadStage(idleState, fd);
      if (res.status === "success") { toast(res.message ?? "Stage updated."); router.refresh(); }
      else toast(res.message ?? "Could not change stage.", "error");
      setTarget(null);
      setLostFor(null);
      setReason("");
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-xs">
      <div className="hidden gap-1 overflow-x-auto pb-1 md:flex [scrollbar-width:thin]">
        {stages.map((s, i) => {
          const done = idx >= 0 && i < idx;
          const active = s.id === currentId;
          return (
            <button key={s.id} type="button" disabled={!canEdit || pending} onClick={() => move(s)} title={s.name}
              className={cn("relative flex min-w-[7.5rem] flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:cursor-default",
                active ? "text-white shadow-sm" : done ? "bg-brand-50 text-brand-700 hover:bg-brand-100" : "bg-canvas text-muted hover:bg-slate-200 hover:text-ink")}
              style={active ? { backgroundColor: s.color } : undefined}>
              {pending && target === s.id && <Loader2 className="size-3 animate-spin" />}
              <span className="truncate">{s.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <label htmlFor="stage-mobile" className="text-xs font-medium text-muted">Stage</label>
        <select id="stage-mobile" disabled={!canEdit || pending} value={currentId ?? ""} onChange={(e) => { const s = stages.find((x) => x.id === e.target.value); if (s) move(s); }}
          className="h-9 flex-1 rounded-lg border border-line bg-white px-2 text-sm">
          {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {pending && <Loader2 className="size-4 animate-spin text-muted" />}
      </div>
      {lostFor && (
        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium">Why is this lead “{lostFor.name}”?</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Budget, chose another agency, not eligible" className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm" />
          </label>
          <div className="flex gap-2">
            <button type="button" className={buttonClass("secondary", "sm")} onClick={() => setLostFor(null)}>Cancel</button>
            <button type="button" className={buttonClass("primary", "sm")} disabled={pending} onClick={() => move(lostFor, reason.trim())}>Move</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConvertLead({ leadId, defaults, staff, visas, countries, canCreateApp, currency }: {
  leadId: string; defaults: { consultant: string | null; visa: string | null; country: string | null }; staff: Opt[]; visas: Opt[]; countries: Opt[]; canCreateApp: boolean; currency: string;
}) {
  return (
    <Modal title="Convert to customer" description="Creates a customer record linked to this lead. All lead history is kept." trigger={<span id="convert-trigger">Convert to customer</span>} triggerVariant="primary" size="lg">
      <CrmForm action={convertLead} submitLabel="Convert lead" pendingLabel="Converting…">
        <input type="hidden" name="leadId" value={leadId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={`Total package amount (${currency})`} name="package_amount" type="number" min={0} step="0.01" required defaultValue="0" />
          <SelectField label="Assigned consultant" name="consultant_id" defaultValue={defaults.consultant} options={staff} placeholder="Lead's assignee" />
          <SelectField label="Visa category" name="visa_category" defaultValue={defaults.visa} options={visas} />
          <SelectField label="Destination country" name="destination_country" defaultValue={defaults.country} options={countries} />
          <TextField label="Application reference number" name="application_ref" hint="Optional — e.g. embassy / VFS reference" />
          <div />
          <TextAreaField label="Notes" name="notes" className="sm:col-span-2" rows={2} />
          {canCreateApp && <div className="sm:col-span-2"><CheckboxField name="create_application" label="Also open a visa application for this customer" defaultChecked /></div>}
        </div>
      </CrmForm>
    </Modal>
  );
}

export function AssignLead({ leadId, current, staff, canReassign }: { leadId: string; current: string | null; staff: Opt[]; canReassign: boolean }) {
  if (current && !canReassign) return null;
  return (
    <Modal title={current ? "Reassign lead" : "Assign lead"} trigger={current ? "Reassign" : "Assign"} triggerClassName="text-xs font-semibold text-brand-700 hover:underline" size="sm">
      <CrmForm action={assignLead} submitLabel="Save">
        <input type="hidden" name="leadId" value={leadId} />
        <SelectField label="Employee" name="userId" defaultValue={current} options={staff} required />
        <p className="text-xs text-muted">Pending follow-ups move to the new owner, who gets a notification.</p>
      </CrmForm>
    </Modal>
  );
}
