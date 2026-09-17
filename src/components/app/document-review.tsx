import { ActionForm } from "@/components/app/action-form";
import { StatusBadge } from "@/components/app/status-badge";
import { ViewDocumentButton } from "@/components/app/view-document-button";
import { Select, Textarea } from "@/components/ui/fields";
import { reviewDocument } from "@/lib/admin/actions";
import { DOCUMENT_TYPE_LABEL } from "@/lib/immigration/status";
import { formatDate } from "@/lib/utils";

export type ReviewableDocument = {
  id: string; doc_type: string; label: string | null; status: string; updated_at: string; storage_path: string | null;
  document_remarks?: { body: string; created_at: string }[];
};

export function DocumentReviewRow({ doc, canReview }: { doc: ReviewableDocument; canReview: boolean }) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{doc.label ?? DOCUMENT_TYPE_LABEL.get(doc.doc_type) ?? doc.doc_type}</p>
          <p className="text-xs text-muted">Updated {formatDate(doc.updated_at, { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="flex items-center gap-3">{doc.storage_path && <ViewDocumentButton documentId={doc.id} />}<StatusBadge status={doc.status} /></div>
      </div>
      {doc.document_remarks?.map((r, i) => <p key={i} className="rounded bg-canvas px-3 py-1.5 text-xs text-ink-soft">{r.body}</p>)}
      {canReview && doc.storage_path && ["uploaded", "under_review"].includes(doc.status) && (
        <ActionForm action={reviewDocument} submitLabel="Save review" className="grid gap-2 sm:grid-cols-[180px_1fr]">
          <input type="hidden" name="documentId" value={doc.id} />
          <Select name="decision" defaultValue="approved" aria-label="Decision">
            <option value="under_review">Mark under review</option>
            <option value="approved">Approve</option>
            <option value="reupload_required">Re-upload required</option>
            <option value="rejected">Reject</option>
          </Select>
          <Textarea name="remark" rows={1} placeholder="Remark for the customer (required for re-upload / reject)" aria-label="Remark" />
        </ActionForm>
      )}
    </div>
  );
}
