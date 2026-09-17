"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { uploadDocument } from "@/lib/documents/actions";
import { idleState } from "@/lib/forms";
import { DOCUMENT_TYPES } from "@/lib/immigration/status";

export function DocumentUpload({ documentId, applicationId, compact }: { documentId?: string; applicationId?: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(uploadDocument, idleState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className={compact ? "flex flex-wrap items-center gap-2" : "grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end"}>
      {documentId && <input type="hidden" name="documentId" value={documentId} />}
      {applicationId && <input type="hidden" name="applicationId" value={applicationId} />}
      {!documentId && (
        <label className="text-sm">
          <span className="mb-1 block font-medium">Document type</span>
          <Select name="docType" required defaultValue="">
            <option value="" disabled>Select…</option>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </label>
      )}
      <label className="text-sm">
        {!compact && <span className="mb-1 block font-medium">File (PDF, JPG, PNG, WebP · max 10 MB)</span>}
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700"
        />
      </label>
      <Button type="submit" size={compact ? "sm" : "md"} disabled={pending}>{pending ? "Uploading…" : "Upload"}</Button>
      {state.message && (
        <p role="status" className={`text-sm sm:col-span-3 ${state.status === "success" ? "text-success" : "text-danger"}`}>{state.message}</p>
      )}
    </form>
  );
}
