"use client";

import { useState } from "react";
import { Ban, Check, CheckCircle2, Clock, RotateCcw, Trash2, XCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { istToday } from "@/lib/crm/dates";
import { addLeadActivity } from "@/lib/crm/actions/leads";
import { createFollowUp, deleteFollowUp, rescheduleFollowUp, setFollowUpStatus } from "@/lib/crm/actions/follow-ups";
import { deleteDocument, uploadDocument, verifyDocument } from "@/lib/crm/actions/documents";
import { CheckboxField, FileField, SelectField, TextAreaField, TextField } from "./fields";
import { ActionButton, ConfirmButton, CrmForm, Modal } from "./interactive";

type Opt = { value: string; label: string };

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
export function FollowUpForm({ leadId, customerId, staff, canAssign, viewerId, defaultTitle }: {
  leadId?: string; customerId?: string; staff: Opt[]; canAssign: boolean; viewerId: string; defaultTitle?: string;
}) {
  const [today] = useState(istToday);
  return (
    <CrmForm action={createFollowUp} submitLabel="Schedule follow-up" resetOnSuccess>
      {leadId && <input type="hidden" name="lead_id" value={leadId} />}
      {customerId && <input type="hidden" name="customer_id" value={customerId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Title" name="title" required defaultValue={defaultTitle} className="sm:col-span-2" />
        <SelectField label="Type" name="type" defaultValue="call" allowEmpty={false} options={[
          { value: "call", label: "Call" }, { value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "Email" },
          { value: "meeting", label: "Meeting / consultation" }, { value: "task", label: "Task" }, { value: "other", label: "Other" },
        ]} />
        {canAssign ? <SelectField label="Assign to" name="assigned_to" defaultValue={viewerId} allowEmpty={false} options={staff} /> : <div />}
        <TextField label="Date" name="date" type="date" required defaultValue={today} min={today} />
        <TextField label="Time" name="time" type="time" defaultValue="11:00" />
        <TextAreaField label="Notes" name="notes" className="sm:col-span-2" rows={2} />
      </div>
    </CrmForm>
  );
}

export function FollowUpActions({ id, status, canDelete, staff, canAssign }: { id: string; status: string; canDelete: boolean; staff: Opt[]; canAssign: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {status === "pending" && (
        <>
          <Modal title="Complete follow-up" trigger={<><Check className="size-4" />Done</>} triggerVariant="secondary" size="sm">
            <CrmForm action={setFollowUpStatus} submitLabel="Mark completed">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="completed" />
              <TextAreaField label="Outcome / notes" name="outcome" rows={3} placeholder="What happened? Next step?" />
            </CrmForm>
          </Modal>
          <Modal title="Reschedule" trigger={<Clock className="size-4" />} triggerClassName={buttonClass("ghost", "sm")} size="sm">
            <CrmForm action={rescheduleFollowUp} submitLabel="Reschedule">
              <input type="hidden" name="id" value={id} />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Date" name="date" type="date" required />
                <TextField label="Time" name="time" type="time" defaultValue="11:00" />
                {canAssign && <SelectField label="Assign to" name="assigned_to" options={staff} placeholder="Keep current" className="col-span-2" />}
              </div>
            </CrmForm>
          </Modal>
          <ActionButton action={setFollowUpStatus} fields={{ id, status: "missed" }} variant="ghost" title="Mark as missed"><Ban className="size-4" /></ActionButton>
        </>
      )}
      {status !== "pending" && <ActionButton action={setFollowUpStatus} fields={{ id, status: "pending" }} variant="ghost" title="Reopen"><RotateCcw className="size-4" /></ActionButton>}
      {canDelete && (
        <ConfirmButton action={deleteFollowUp} fields={{ id }} title="Delete follow-up?" message="This removes the follow-up permanently." confirmLabel="Delete"><Trash2 className="size-4" /></ConfirmButton>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity log (notes, calls, WhatsApp, comments)
// ---------------------------------------------------------------------------
export function ActivityForm({ leadId }: { leadId: string }) {
  const [kind, setKind] = useState("note");
  const tabs = [
    { value: "note", label: "Note" }, { value: "call", label: "Call" }, { value: "whatsapp", label: "WhatsApp" },
    { value: "email", label: "Email" }, { value: "meeting", label: "Meeting" }, { value: "comment", label: "Internal comment" },
  ];
  return (
    <CrmForm action={addLeadActivity} submitLabel="Save" resetOnSuccess>
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap gap-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={kind === t.value} onClick={() => setKind(t.value)}
            className={kind === t.value ? "rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white" : "rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-soft hover:bg-brand-50"}>
            {t.label}
          </button>
        ))}
      </div>
      {(kind === "call" || kind === "whatsapp") && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Direction" name="direction" defaultValue="outbound" allowEmpty={false} options={[{ value: "outbound", label: "Outgoing" }, { value: "inbound", label: "Incoming" }]} />
          <SelectField label="Outcome" name="outcome" options={kind === "call"
            ? [{ value: "connected", label: "Connected" }, { value: "no_answer", label: "No answer" }, { value: "busy", label: "Busy" }, { value: "switched_off", label: "Switched off" }, { value: "wrong_number", label: "Wrong number" }, { value: "call_back", label: "Asked to call back" }]
            : [{ value: "sent", label: "Sent" }, { value: "replied", label: "Replied" }, { value: "read", label: "Read, no reply" }]} />
          {kind === "call" ? <TextField label="Duration (min)" name="duration" type="number" min={0} max={600} /> : <div />}
        </div>
      )}
      <TextAreaField label={kind === "comment" ? "Comment (staff only)" : "Details"} name="body" required rows={3}
        placeholder={kind === "call" ? "Summary of the call…" : kind === "whatsapp" ? "Message sent / received…" : "Write a note…"} />
      {kind === "note" && <CheckboxField name="markContacted" label="Lead was contacted" />}
    </CrmForm>
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------
export function DocumentUpload({ leadId, customerId, applicationId, docTypes, applications }: {
  leadId?: string; customerId?: string; applicationId?: string; docTypes: Opt[]; applications?: Opt[];
}) {
  return (
    <Modal title="Upload documents" description="PDF, JPG or PNG · up to 10 MB each · up to 10 files" trigger="Upload documents" triggerVariant="primary">
      <CrmForm action={uploadDocument} submitLabel="Upload" pendingLabel="Uploading…" encType="multipart/form-data">
        {leadId && <input type="hidden" name="lead_id" value={leadId} />}
        {customerId && <input type="hidden" name="customer_id" value={customerId} />}
        {applicationId && <input type="hidden" name="application_id" value={applicationId} />}
        <SelectField label="Document type" name="doc_type" required options={docTypes} />
        {applications && applications.length > 0 && !applicationId && <SelectField label="Visa application (optional)" name="application_id" options={applications} placeholder="Not linked" />}
        <TextField label="Title / description" name="title" placeholder="e.g. Passport front & back" />
        <MultiFile />
      </CrmForm>
    </Modal>
  );
}

function MultiFile() {
  return (
    <div>
      <FileField label="Files" name="file" required multiple />
      <p className="mt-1 text-xs text-muted">You can select several files of the same type at once.</p>
    </div>
  );
}

export function DocumentActions({ id, status, canVerify, canDelete }: { id: string; status: string; canVerify: boolean; canDelete: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <a href={`/api/crm/files/document/${id}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>Preview</a>
      <a href={`/api/crm/files/document/${id}?download=1`} className={buttonClass("ghost", "sm")}>Download</a>
      {canVerify && status !== "verified" && <ActionButton action={verifyDocument} fields={{ id, status: "verified" }} variant="ghost" title="Verify"><CheckCircle2 className="size-4 text-success" /></ActionButton>}
      {canVerify && status !== "rejected" && (
        <Modal title="Reject document" trigger={<XCircle className="size-4 text-danger" />} triggerClassName={buttonClass("ghost", "sm")} size="sm">
          <CrmForm action={verifyDocument} submitLabel="Reject document" variant="danger">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="rejected" />
            <TextAreaField label="Remarks for the team / customer" name="remarks" required rows={3} placeholder="e.g. Photo is blurry — upload a clearer scan" />
          </CrmForm>
        </Modal>
      )}
      {canVerify && status !== "pending" && <ActionButton action={verifyDocument} fields={{ id, status: "pending" }} variant="ghost" title="Back to pending"><RotateCcw className="size-4" /></ActionButton>}
      {canDelete && <ConfirmButton action={deleteDocument} fields={{ id }} title="Delete document?" message="The file is removed from storage permanently." confirmLabel="Delete"><Trash2 className="size-4" /></ConfirmButton>}
    </div>
  );
}
