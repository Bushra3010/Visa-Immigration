"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { crmAudit, crmAuthorize, dbErrorMessage, DENIED, FAILED, INVALID } from "../auth";
import { getCrmConfig } from "../config";
import { removePrivateFiles, storePrivateFile } from "../files";
import { formValues, optText, optUuid } from "../schemas";

export async function uploadDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("documents.create");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ lead_id: optUuid, customer_id: optUuid, application_id: optUuid, doc_type: z.string({ error: "Choose a document type" }).min(1, "Choose a document type").max(60), title: optText(160) })
    .refine((v) => v.lead_id || v.customer_id, { path: ["doc_type"], message: "Missing record" })
    .safeParse(formValues(formData, ["lead_id", "customer_id", "application_id", "doc_type", "title"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const config = await getCrmConfig();
  if (!config.options.document_type.some((o) => o.key === d.doc_type)) return { status: "error", fieldErrors: { doc_type: "Choose a document type" } };

  // Confirm the parent record is visible to this user (RLS) before writing any file.
  const supabase = await createClient();
  let leadId = d.lead_id ?? null;
  if (d.customer_id) {
    const { data: c } = await supabase.from("crm_customers").select("id, lead_id").eq("id", d.customer_id).maybeSingle();
    if (!c) return DENIED;
    leadId = leadId ?? c.lead_id;
  } else if (leadId) {
    const { data: l } = await supabase.from("leads").select("id").eq("id", leadId).maybeSingle();
    if (!l) return DENIED;
  }

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { status: "error", fieldErrors: { file: "Choose a file to upload" }, message: "Choose a file to upload." };
  if (files.length > 10) return { status: "error", message: "Upload up to 10 files at a time." };

  const folder = d.customer_id ? `customers/${d.customer_id}` : `leads/${leadId}`;
  let saved = 0;
  for (const file of files) {
    const stored = await storePrivateFile(file, folder, { required: true });
    if (!stored.ok || !stored.file) return { status: "error", fieldErrors: { file: stored.ok ? "Upload failed" : stored.error }, message: `${file.name}: ${stored.ok ? "Upload failed" : stored.error}${saved ? ` (${saved} uploaded before this one)` : ""}` };
    const { data, error } = await supabase
      .from("crm_documents")
      .insert({
        lead_id: leadId, customer_id: d.customer_id ?? null, application_id: d.application_id ?? null, doc_type: d.doc_type,
        title: d.title ?? null, storage_path: stored.file.path, file_name: stored.file.name, mime_type: stored.file.mime, size_bytes: stored.file.size,
        uploaded_by: viewer.id,
      })
      .select("id")
      .single();
    if (error || !data) {
      await removePrivateFiles([stored.file.path]);
      return { status: "error", message: dbErrorMessage(error) };
    }
    saved++;
    await crmAudit(viewer, "document.uploaded", "documents", data.id, { doc_type: d.doc_type, file: stored.file.name, lead_id: leadId, customer_id: d.customer_id ?? null });
  }
  if (leadId) await supabase.from("crm_lead_history").insert({ lead_id: leadId, actor_id: viewer.id, event: "document", note: `${saved} document${saved > 1 ? "s" : ""} uploaded (${config.label("document_type", d.doc_type)})` });
  revalidatePath("/crm", "layout");
  return { status: "success", message: saved > 1 ? `${saved} documents uploaded.` : "Document uploaded." };
}

export async function verifyDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer || !(viewer.isSuper || viewer.permissions.includes("documents.approve") || viewer.permissions.includes("documents.edit"))) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["pending", "verified", "rejected"]), remarks: optText(1000) })
    .refine((v) => v.status !== "rejected" || !!v.remarks, { path: ["remarks"], message: "Add a remark explaining the rejection" })
    .safeParse(formValues(formData, ["id", "status", "remarks"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error), message: parsed.error.issues[0]?.message };
  const { id, status, remarks } = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("crm_documents")
    .update({ status, remarks: remarks ?? null, verified_by: status === "pending" ? null : viewer.id, verified_at: status === "pending" ? null : new Date().toISOString() }, { count: "exact" })
    .eq("id", id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!count) return DENIED;
  await crmAudit(viewer, `document.${status}`, "documents", id, { remarks });
  revalidatePath("/crm", "layout");
  return { status: "success", message: status === "verified" ? "Document verified." : status === "rejected" ? "Document rejected." : "Marked as pending." };
}

export async function deleteDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("documents.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("crm_documents").select("id, storage_path, file_name, doc_type, lead_id, customer_id").eq("id", id.data).maybeSingle();
  if (!doc) return DENIED;
  const { error } = await supabase.from("crm_documents").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await removePrivateFiles([doc.storage_path]);
  await crmAudit(viewer, "document.deleted", "documents", id.data, { file: doc.file_name, doc_type: doc.doc_type, lead_id: doc.lead_id, customer_id: doc.customer_id });
  revalidatePath("/crm", "layout");
  return { status: "success", message: "Document deleted." };
}
