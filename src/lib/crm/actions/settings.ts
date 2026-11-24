"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { crmAudit, crmAuthorize, dbErrorMessage, DENIED, FAILED, INVALID } from "../auth";
import { invalidateCrmConfig } from "../config";
import { storePublicImage } from "../files";
import { formValues, hexColor, optEmail, optText, reqText } from "../schemas";

const done = (message: string): FormState => {
  invalidateCrmConfig();
  revalidatePath("/crm", "layout");
  return { status: "success", message };
};

async function upsertSetting(key: string, value: unknown, actorId: string) {
  const supabase = await createClient();
  return supabase.from("crm_settings").upsert({ key, value, updated_by: actorId }, { onConflict: "key" });
}

export async function saveCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      name: reqText("Company name", 120),
      email: optEmail,
      phone: optText(40),
      address: optText(400),
      gstin: z.string().trim().regex(/^[0-9A-Z]{15}$/, "GSTIN has 15 characters").optional(),
      website: z.url("Enter a full URL, e.g. https://newvisa.io").max(200).optional(),
      logo_url: optText(500),
    })
    .safeParse(formValues(formData, ["name", "email", "phone", "address", "gstin", "website", "logo_url"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const logo = await storePublicImage(formData.get("logo"), "branding");
  if (!logo.ok) return { status: "error", fieldErrors: { logo: logo.error }, message: logo.error };
  const value = { ...parsed.data, logo_url: formData.get("remove_logo") === "on" ? null : logo.file?.path ?? parsed.data.logo_url ?? null };
  const { error } = await upsertSetting("company", value, viewer.id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.company_updated", "settings", "company", value);
  return done("Company information saved.");
}

export async function savePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const currency = z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code").safeParse(String(formData.get("currency") ?? "").toUpperCase());
  if (!currency.success) return { ...INVALID, fieldErrors: { currency: "Use a 3-letter ISO currency code, e.g. INR" } };
  const keys = ["lead_assigned", "follow_up_reminders", "expense_submitted", "expense_decided", "document_rejected"];
  const notifications = Object.fromEntries(keys.map((k) => [k, formData.get(`n_${k}`) === "on"]));
  const [a, b] = await Promise.all([upsertSetting("currency", currency.data, viewer.id), upsertSetting("notifications", notifications, viewer.id)]);
  if (a.error || b.error) return FAILED;
  await crmAudit(viewer, "settings.preferences_updated", "settings", "preferences", { currency: currency.data, notifications });
  return done("Preferences saved.");
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------
const stageSchema = z.object({
  name: reqText("Stage name", 60),
  color: hexColor,
  kind: z.enum(["open", "won", "lost"]),
  is_active: z.enum(["on"]).optional(),
});

export async function saveStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const id = formData.get("id") ? z.uuid().safeParse(formData.get("id")) : null;
  if (id && !id.success) return FAILED;
  const parsed = stageSchema.safeParse(formValues(formData, ["name", "color", "kind", "is_active"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const row = { name: d.name, color: d.color, is_won: d.kind === "won", is_lost: d.kind === "lost", is_active: !id || d.is_active === "on" };

  if (id?.data) {
    const { data: stage } = await supabase.from("crm_lead_stages").select("is_default").eq("id", id.data).maybeSingle();
    if (stage?.is_default && !row.is_active) return { status: "error", message: "The default stage for new leads can't be hidden." };
    const { error } = await supabase.from("crm_lead_stages").update(row).eq("id", id.data);
    if (error) return { status: "error", message: dbErrorMessage(error) };
    await crmAudit(viewer, "settings.stage_updated", "settings", id.data, row);
    return done("Stage saved.");
  }
  const { data: last } = await supabase.from("crm_lead_stages").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const key = `${d.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "stage"}_${Math.random().toString(36).slice(2, 5)}`;
  const { data, error } = await supabase.from("crm_lead_stages").insert({ ...row, key: /^[a-z]/.test(key) ? key : `s_${key}`, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.stage_created", "settings", data.id, row);
  return done(`Stage “${d.name}” added.`);
}

export async function moveStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const parsed = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) }).safeParse(formValues(formData, ["id", "direction"]));
  if (!parsed.success) return FAILED;
  const supabase = await createClient();
  const { data: stages } = await supabase.from("crm_lead_stages").select("id, sort_order").order("sort_order");
  const list = stages ?? [];
  const i = list.findIndex((s) => s.id === parsed.data.id);
  const j = parsed.data.direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { status: "success" };
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, idx) => supabase.from("crm_lead_stages").update({ sort_order: (idx + 1) * 10 }).eq("id", s.id)));
  await crmAudit(viewer, "settings.stage_reordered", "settings", parsed.data.id, parsed.data);
  return done("Order updated.");
}

export async function setDefaultStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: target } = await supabase.from("crm_lead_stages").select("id, is_won, is_lost, is_active").eq("id", id.data).maybeSingle();
  if (!target || target.is_won || target.is_lost || !target.is_active) return { status: "error", message: "Pick an active, open stage as the default." };
  await supabase.from("crm_lead_stages").update({ is_default: false }).eq("is_default", true);
  const { error } = await supabase.from("crm_lead_stages").update({ is_default: true }).eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.stage_default", "settings", id.data);
  return done("Default stage updated.");
}

export async function deleteStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: stage } = await supabase.from("crm_lead_stages").select("id, name, is_default, legacy_status").eq("id", id.data).maybeSingle();
  if (!stage) return FAILED;
  if (stage.is_default) return { status: "error", message: "Choose another default stage before deleting this one." };
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", id.data);
  if (count) return { status: "error", message: `${count} lead${count > 1 ? "s are" : " is"} in this stage. Move them first, or hide the stage instead.` };
  const { error } = await supabase.from("crm_lead_stages").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.stage_deleted", "settings", id.data, { name: stage.name });
  return done(`Stage “${stage.name}” deleted.`);
}

// ---------------------------------------------------------------------------
// Option lists (lead sources, visa categories, countries, statuses, …)
// ---------------------------------------------------------------------------
const KINDS = ["lead_source", "visa_category", "destination_country", "application_status", "expense_category", "payment_mode", "document_type"] as const;

export async function saveOption(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      id: z.uuid().optional(),
      kind: z.enum(KINDS),
      label: reqText("Label", 80),
      color: hexColor.optional(),
      is_active: z.literal("on").optional(),
    })
    .safeParse(formValues(formData, ["id", "kind", "label", "color", "is_active"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  if (d.id) {
    const { error } = await supabase.from("crm_options").update({ label: d.label, color: d.color ?? null, is_active: d.is_active === "on" }).eq("id", d.id).eq("kind", d.kind);
    if (error) return { status: "error", message: dbErrorMessage(error) };
    await crmAudit(viewer, "settings.option_updated", "settings", d.id, d);
    return done("Saved.");
  }
  const base = d.label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50) || "option";
  const { data: clash } = await supabase.from("crm_options").select("key").eq("kind", d.kind).eq("key", base).maybeSingle();
  const key = clash ? `${base}_${Math.random().toString(36).slice(2, 5)}` : base;
  const { data: last } = await supabase.from("crm_options").select("sort_order").eq("kind", d.kind).neq("key", "other").order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase.from("crm_options").insert({ kind: d.kind, key, label: d.label, color: d.color ?? null, sort_order: (last?.sort_order ?? 0) + 1 }).select("id").single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.option_created", "settings", data.id, { ...d, key });
  return done(`“${d.label}” added.`);
}

export async function deleteOption(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: opt } = await supabase.from("crm_options").select("id, kind, key, label").eq("id", id.data).maybeSingle();
  if (!opt) return FAILED;
  const usage: Record<string, [string, string][]> = {
    lead_source: [["leads", "source"]],
    visa_category: [["leads", "visa_type"], ["crm_customers", "visa_category"]],
    destination_country: [["leads", "destination_country"], ["crm_customers", "destination_country"]],
    application_status: [["crm_applications", "status"]],
    expense_category: [["crm_expenses", "category"]],
    payment_mode: [["crm_payments", "payment_mode"], ["crm_expenses", "payment_mode"]],
    document_type: [["crm_documents", "doc_type"]],
  };
  for (const [table, column] of usage[opt.kind] ?? []) {
    const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, opt.key);
    if (count) return { status: "error", message: `“${opt.label}” is used by ${count} record${count > 1 ? "s" : ""}. Deactivate it instead so existing records keep their label.` };
  }
  const { error } = await supabase.from("crm_options").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.option_deleted", "settings", id.data, opt);
  return done(`“${opt.label}” deleted.`);
}

// ---------------------------------------------------------------------------
// Custom fields
// ---------------------------------------------------------------------------
export async function saveCustomField(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      id: z.uuid().optional(),
      entity: z.enum(["lead", "customer", "application"]),
      label: reqText("Label", 80),
      field_type: z.enum(["text", "textarea", "number", "date", "select", "checkbox"]),
      options: optText(2000),
      is_required: z.literal("on").optional(),
      is_active: z.literal("on").optional(),
    })
    .refine((v) => v.field_type !== "select" || (v.options ?? "").split("\n").some((o) => o.trim()), { path: ["options"], message: "Add at least one option (one per line)" })
    .safeParse(formValues(formData, ["id", "entity", "label", "field_type", "options", "is_required", "is_active"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const options = d.field_type === "select" ? [...new Set((d.options ?? "").split("\n").map((o) => o.trim()).filter(Boolean))].slice(0, 50) : [];
  const supabase = await createClient();
  const row = { label: d.label, field_type: d.field_type, options, is_required: d.is_required === "on", is_active: !d.id || d.is_active === "on" };
  if (d.id) {
    const { error } = await supabase.from("crm_custom_fields").update(row).eq("id", d.id);
    if (error) return { status: "error", message: dbErrorMessage(error) };
    await crmAudit(viewer, "settings.custom_field_updated", "settings", d.id, row);
    return done("Custom field saved.");
  }
  const key = (d.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "f_$1").slice(0, 32) || "field") + "_" + Math.random().toString(36).slice(2, 5);
  const { data, error } = await supabase.from("crm_custom_fields").insert({ ...row, entity: d.entity, key: /^[a-z]/.test(key) ? key : `f_${key}` }).select("id").single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.custom_field_created", "settings", data.id, { ...row, entity: d.entity });
  return done(`Field “${d.label}” added.`);
}

export async function deleteCustomField(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("settings.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { error } = await supabase.from("crm_custom_fields").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "settings.custom_field_deleted", "settings", id.data);
  return done("Custom field deleted. Values already saved on records are kept.");
}

export async function updateOwnProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer) return DENIED;
  const parsed = z
    .object({ full_name: reqText("Name", 120), mobile: z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid number").optional() })
    .safeParse(formValues(formData, ["full_name", "mobile"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const avatar = await storePublicImage(formData.get("avatar"), "avatars");
  if (!avatar.ok) return { status: "error", fieldErrors: { avatar: avatar.error }, message: avatar.error };
  const row: Record<string, unknown> = { full_name: parsed.data.full_name, mobile: parsed.data.mobile ?? null };
  if (avatar.file) row.avatar_url = avatar.file.path;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(row).eq("id", viewer.id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "user.profile_updated", "users", viewer.id, row);
  return done("Profile updated.");
}
