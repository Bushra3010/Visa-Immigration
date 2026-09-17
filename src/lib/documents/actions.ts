"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { notifyInApp } from "@/lib/notifications";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_TYPES } from "@/lib/immigration/status";
import { checkUpload, safeFileName } from "./validation";

const uploadSchema = z.object({
  documentId: z.uuid().optional(),
  applicationId: z.uuid().optional(),
  docType: z.enum(DOCUMENT_TYPES.map((d) => d.value) as [string, ...string[]]).optional(),
  label: z.string().trim().max(120).optional(),
});

const blank = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : String(v));

/**
 * Customer document upload (PRD §6.8). Either fulfils a requested slot
 * (documentId) or adds a new document of a given type.
 * TODO(security): route files through a malware scanner before they are
 * visible to staff once a scanning service is chosen (PRD §12.3).
 */
export async function uploadDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please log in again." };
  if (!(await rateLimit("upload", 30, 10 * 60_000)).ok) return { status: "error", message: "Too many uploads. Please wait a few minutes." };

  const parsed = uploadSchema.safeParse({
    documentId: blank(formData.get("documentId")),
    applicationId: blank(formData.get("applicationId")),
    docType: blank(formData.get("docType")),
    label: blank(formData.get("label")),
  });
  const file = formData.get("file");
  if (!parsed.success || !(file instanceof File)) return { status: "error", message: "Choose a file to upload." };
  if (!parsed.data.documentId && !parsed.data.docType) return { status: "error", message: "Choose the document type." };

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const check = checkUpload(file.name, file.size, head);
  if (!check.ok) return { status: "error", message: check.reason };

  // Ownership and slot state are verified with the user's own RLS-bound client.
  const supabase = await createClient();
  const admin = createAdminClient();
  let documentId = parsed.data.documentId;
  let applicationId = parsed.data.applicationId ?? null;

  if (documentId) {
    const { data: doc } = await supabase.from("documents").select("id, status, application_id").eq("id", documentId).eq("user_id", viewer.id).maybeSingle();
    if (!doc) return { status: "error", message: "Document request not found." };
    if (!["requested", "reupload_required", "rejected"].includes(doc.status)) return { status: "error", message: "This document has already been submitted." };
    applicationId = doc.application_id;
  } else {
    if (applicationId) {
      const { data: app } = await supabase.from("applications").select("id").eq("id", applicationId).eq("user_id", viewer.id).maybeSingle();
      if (!app) return { status: "error", message: "Application not found." };
    }
    const { data: created, error } = await admin
      .from("documents")
      .insert({ user_id: viewer.id, application_id: applicationId, doc_type: parsed.data.docType, label: parsed.data.label, status: "requested" })
      .select("id")
      .single();
    if (error || !created) return { status: "error", message: "Could not save document." };
    documentId = created.id;
  }

  const path = `${viewer.id}/${documentId}/${Date.now()}-${safeFileName(file.name)}.${check.ext}`;
  const { error: uploadError } = await admin.storage.from("documents").upload(path, file, { contentType: check.mime, upsert: false });
  if (uploadError) {
    console.error("Storage upload failed", uploadError);
    return { status: "error", message: "Upload failed. Please try again." };
  }

  const { error: updateError } = await admin
    .from("documents")
    .update({ status: "uploaded", storage_path: path, mime_type: check.mime, size_bytes: file.size, reviewed_by: null, reviewed_at: null })
    .eq("id", documentId)
    .eq("user_id", viewer.id);
  if (updateError) return { status: "error", message: "Could not save document." };

  if (applicationId) {
    const { data: app } = await admin.from("applications").select("counsellor_id, code").eq("id", applicationId).single();
    if (app?.counsellor_id) await notifyInApp(app.counsellor_id, "document_requested", { event: "uploaded", documentId, application: app.code });
  }
  await admin.from("audit_logs").insert({ actor_id: viewer.id, action: "document.uploaded", entity: "document", entity_id: documentId });

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/applications", "layout");
  return { status: "success", message: "Uploaded — our documentation team will review it shortly." };
}

/** Short-lived signed URL; access is authorised via RLS on the documents table first. */
export async function getDocumentUrl(documentId: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path").eq("id", documentId).maybeSingle();
  if (!doc?.storage_path) return null;
  const { data } = await createAdminClient().storage.from("documents").createSignedUrl(doc.storage_path, 60);
  await createAdminClient().from("audit_logs").insert({ actor_id: viewer.id, action: "document.viewed", entity: "document", entity_id: documentId });
  return data?.signedUrl ?? null;
}
