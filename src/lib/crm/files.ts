import "server-only";
import { checkUpload, safeFileName } from "@/lib/documents/validation";
import { createAdminClient } from "@/lib/supabase/admin";

const PRIVATE_BUCKET = "crm-documents";
const PUBLIC_BUCKET = "crm-public";
const PRIVATE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const PUBLIC_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type StoredFile = { path: string; mime: string; size: number; name: string };
export type UploadResult = { ok: true; file: StoredFile } | { ok: false; error: string } | { ok: true; file: null };

/** Reads an optional <input type=file> value. Returns file: null when nothing was chosen. */
function pickFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

/**
 * Validates (size, extension, magic bytes) and stores a file in the private
 * crm-documents bucket. Callers must have authorised the user and the
 * parent record first; downloads go through /api/crm/files.
 */
export async function storePrivateFile(value: FormDataEntryValue | null, folder: string, { required = false } = {}): Promise<UploadResult> {
  const file = pickFile(value);
  if (!file) return required ? { ok: false, error: "Choose a file to upload." } : { ok: true, file: null };
  const buf = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, file.size, buf.slice(0, 16));
  if (!check.ok) return { ok: false, error: check.reason };
  if (!PRIVATE_TYPES.has(check.mime)) return { ok: false, error: "Only PDF, JPG and PNG files are accepted." };

  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}.${check.ext}`;
  const { error } = await createAdminClient().storage.from(PRIVATE_BUCKET).upload(path, buf, { contentType: check.mime, upsert: false });
  if (error) {
    console.error("CRM file upload failed", error);
    return { ok: false, error: "Upload failed. Please try again." };
  }
  return { ok: true, file: { path, mime: check.mime, size: file.size, name: file.name.slice(0, 200) } };
}

export async function removePrivateFiles(paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (list.length) await createAdminClient().storage.from(PRIVATE_BUCKET).remove(list);
}

export async function signedUrl(path: string, opts: { download?: string | boolean } = {}) {
  const { data, error } = await createAdminClient().storage.from(PRIVATE_BUCKET).createSignedUrl(path, 60, { download: opts.download });
  if (error || !data) return null;
  return data.signedUrl;
}

/** Logo / profile picture: public bucket, images only, 2 MB. */
export async function storePublicImage(value: FormDataEntryValue | null, folder: string): Promise<UploadResult> {
  const file = pickFile(value);
  if (!file) return { ok: true, file: null };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: "Images must be 2 MB or smaller." };
  const buf = new Uint8Array(await file.arrayBuffer());
  const check = checkUpload(file.name, file.size, buf.slice(0, 16));
  if (!check.ok || !PUBLIC_TYPES.has(check.mime)) return { ok: false, error: "Use a JPG, PNG or WebP image." };
  const path = `${folder}/${crypto.randomUUID()}.${check.ext}`;
  const db = createAdminClient();
  const { error } = await db.storage.from(PUBLIC_BUCKET).upload(path, buf, { contentType: check.mime, upsert: false, cacheControl: "31536000" });
  if (error) return { ok: false, error: "Upload failed. Please try again." };
  return { ok: true, file: { path: db.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl, mime: check.mime, size: file.size, name: file.name } };
}
