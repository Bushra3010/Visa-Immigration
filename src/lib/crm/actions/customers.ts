"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { can, crmAudit, crmAuthorize, dbErrorMessage, DENIED, diff, FAILED, INVALID } from "../auth";
import { getCrmConfig } from "../config";
import { removePrivateFiles, storePrivateFile } from "../files";
import { flash } from "../flash";
import { formValues, money, nullify, optDate, optEmail, optPhone, optText, optUuid, parseCustomFields, positiveMoney, reqText } from "../schemas";

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------
const CUSTOMER_KEYS = ["full_name", "email", "mobile", "whatsapp", "address", "visa_category", "destination_country", "consultant_id", "application_ref", "package_amount", "notes"];

export async function updateCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("customers.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const parsed = z
    .object({
      full_name: reqText("Customer name", 120),
      email: optEmail,
      mobile: optPhone,
      whatsapp: optPhone,
      address: optText(500),
      visa_category: optText(60),
      destination_country: optText(60),
      consultant_id: optUuid,
      application_ref: optText(80),
      package_amount: money.optional(),
      notes: optText(4000),
    })
    .safeParse(formValues(formData, CUSTOMER_KEYS));
  const config = await getCrmConfig();
  const custom = parseCustomFields(formData, config.customFields.filter((f) => f.entity === "customer"));
  if (!parsed.success || !custom.ok) return { ...INVALID, fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...(custom.ok ? {} : custom.errors) } };

  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_customers").select("*").eq("id", id.data).maybeSingle();
  if (!before) return DENIED;
  const row: Record<string, unknown> = { ...nullify(parsed.data), email: parsed.data.email?.toLowerCase() ?? null, custom_fields: custom.values };
  // Package value is financial information.
  if (!can(viewer, "finance.view") && !can(viewer, "payments.edit")) delete row.package_amount;
  else if (parsed.data.package_amount === undefined) delete row.package_amount;

  const changes = diff(before, row);
  if (!Object.keys(changes).length) return { status: "success", message: "No changes." };
  const { error } = await supabase.from("crm_customers").update(row).eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "customer.updated", "customers", id.data, changes);
  revalidatePath(`/crm/customers/${id.data}`);
  return { status: "success", message: "Customer updated." };
}

export async function deleteCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("customers.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: c } = await supabase.from("crm_customers").select("id, code, full_name, lead_id").eq("id", id.data).maybeSingle();
  if (!c) return DENIED;
  const [{ count: pay }, { count: apps }] = await Promise.all([
    supabase.from("crm_payments").select("id", { count: "exact", head: true }).eq("customer_id", id.data),
    supabase.from("crm_applications").select("id", { count: "exact", head: true }).eq("customer_id", id.data),
  ]);
  if (pay || apps) return { status: "error", message: "This customer has payments or visa applications. Delete those first (financial records must be removed explicitly)." };
  const { error } = await supabase.from("crm_customers").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  // The lead goes back to the pipeline (no longer converted).
  await supabase.from("leads").update({ converted_at: null }).eq("id", c.lead_id);
  await crmAudit(viewer, "customer.deleted", "customers", id.data, { code: c.code, name: c.full_name, reason: formData.get("reason") || null });
  revalidatePath("/crm", "layout");
  await flash(`Customer ${c.code} deleted.`);
  redirect("/crm/customers");
}

// ---------------------------------------------------------------------------
// Payments (customer receipts; separate from expenses)
// ---------------------------------------------------------------------------
const PAYMENT_KEYS = ["customer_id", "application_id", "payment_type", "amount", "paid_on", "payment_mode", "transaction_ref", "notes", "received_by"];
const paymentSchema = z.object({
  customer_id: z.uuid(),
  application_id: optUuid,
  payment_type: z.enum(["advance", "installment", "final", "other"]),
  amount: positiveMoney,
  paid_on: z.string({ error: "Pick the payment date" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the payment date"),
  payment_mode: reqText("Payment mode", 60),
  transaction_ref: optText(120),
  notes: optText(1000),
  received_by: optUuid,
});

export async function addPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("payments.create");
  if (!viewer) return DENIED;
  const parsed = paymentSchema.safeParse(formValues(formData, PAYMENT_KEYS));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: customer } = await supabase.from("crm_customers").select("id, code, balance").eq("id", d.customer_id).maybeSingle();
  if (!customer) return DENIED;

  const proof = await storePrivateFile(formData.get("proof"), `payments/${d.customer_id}`);
  if (!proof.ok) return { status: "error", fieldErrors: { proof: proof.error }, message: proof.error };

  const { data, error } = await supabase
    .from("crm_payments")
    .insert({ ...nullify(d), received_by: d.received_by ?? viewer.id, created_by: viewer.id, proof_path: proof.file?.path ?? null })
    .select("id, code")
    .single();
  if (error || !data) {
    await removePrivateFiles([proof.file?.path]);
    if (error?.code === "23505") return { status: "error", fieldErrors: { transaction_ref: "Already recorded for this customer" }, message: "A payment with this transaction reference is already recorded for this customer." };
    return { status: "error", message: dbErrorMessage(error) };
  }
  await crmAudit(viewer, "payment.added", "payments", data.id, { ...d, receipt: data.code });
  revalidatePath(`/crm/customers/${d.customer_id}`);
  const over = Number(customer.balance) - d.amount;
  return { status: "success", message: over < 0 ? `Receipt ${data.code} saved. Note: this exceeds the package balance.` : `Receipt ${data.code} saved.` };
}

export async function updatePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("payments.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = paymentSchema.safeParse(formValues(formData, PAYMENT_KEYS));
  if (!id.success) return FAILED;
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_payments").select("*").eq("id", id.data).maybeSingle();
  if (!before) return DENIED;
  const proof = await storePrivateFile(formData.get("proof"), `payments/${before.customer_id}`);
  if (!proof.ok) return { status: "error", fieldErrors: { proof: proof.error }, message: proof.error };
  const { customer_id: _c, ...rest } = parsed.data;
  const row: Record<string, unknown> = { ...nullify(rest), received_by: rest.received_by ?? before.received_by };
  if (proof.file) row.proof_path = proof.file.path;
  const { error } = await supabase.from("crm_payments").update(row).eq("id", id.data);
  if (error) {
    await removePrivateFiles([proof.file?.path]);
    return { status: "error", message: error.code === "23505" ? "That transaction reference is already used for this customer." : dbErrorMessage(error) };
  }
  if (proof.file && before.proof_path) await removePrivateFiles([before.proof_path]);
  await crmAudit(viewer, "payment.updated", "payments", id.data, diff(before, row));
  revalidatePath(`/crm/customers/${before.customer_id}`);
  return { status: "success", message: "Payment updated." };
}

export async function deletePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("payments.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: p } = await supabase.from("crm_payments").select("*").eq("id", id.data).maybeSingle();
  if (!p) return DENIED;
  const { error } = await supabase.from("crm_payments").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await removePrivateFiles([p.proof_path]);
  await crmAudit(viewer, "payment.deleted", "payments", id.data, { ...p, reason: formData.get("reason") || null });
  revalidatePath(`/crm/customers/${p.customer_id}`);
  return { status: "success", message: `Receipt ${p.code} deleted.` };
}

// ---------------------------------------------------------------------------
// Visa applications
// ---------------------------------------------------------------------------
const APP_KEYS = [
  "customer_id", "visa_type", "destination_country", "consultant_id", "passport_number", "passport_issue_date", "passport_expiry_date",
  "passport_issue_place", "embassy_name", "embassy_city", "embassy_reference", "submission_date", "appointment_at", "biometrics_date",
  "interview_at", "decision_date", "visa_expiry_date", "status", "notes", "status_note",
];
const dateTimeLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a valid date and time").optional();
const appSchema = z.object({
  customer_id: z.uuid(),
  visa_type: optText(60),
  destination_country: optText(60),
  consultant_id: optUuid,
  passport_number: z.string().trim().regex(/^[A-Za-z0-9]{5,20}$/, "Use 5–20 letters/digits").optional(),
  passport_issue_date: optDate,
  passport_expiry_date: optDate,
  passport_issue_place: optText(80),
  embassy_name: optText(160),
  embassy_city: optText(80),
  embassy_reference: optText(120),
  submission_date: optDate,
  appointment_at: dateTimeLocal,
  biometrics_date: optDate,
  interview_at: dateTimeLocal,
  decision_date: optDate,
  visa_expiry_date: optDate,
  status: reqText("Status", 60),
  notes: optText(4000),
  status_note: optText(1000),
});

const istLocal = (v: string | undefined) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

function appRow(d: z.infer<typeof appSchema>) {
  const { status_note: _n, customer_id: _c, ...rest } = d;
  return { ...nullify(rest), passport_number: rest.passport_number?.toUpperCase() ?? null, appointment_at: istLocal(rest.appointment_at), interview_at: istLocal(rest.interview_at) };
}

export async function createApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("applications.create");
  if (!viewer) return DENIED;
  const parsed = appSchema.safeParse(formValues(formData, APP_KEYS));
  const config = await getCrmConfig();
  const custom = parseCustomFields(formData, config.customFields.filter((f) => f.entity === "application"));
  if (!parsed.success || !custom.ok) return { ...INVALID, fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...(custom.ok ? {} : custom.errors) } };
  if (!config.options.application_status.some((o) => o.key === parsed.data.status)) return { status: "error", fieldErrors: { status: "Choose a status" } };
  const supabase = await createClient();
  const { data: customer } = await supabase.from("crm_customers").select("id, lead_id, consultant_id").eq("id", parsed.data.customer_id).maybeSingle();
  if (!customer) return DENIED;
  const { data, error } = await supabase
    .from("crm_applications")
    .insert({ ...appRow(parsed.data), consultant_id: parsed.data.consultant_id ?? customer.consultant_id, customer_id: customer.id, lead_id: customer.lead_id, custom_fields: custom.values, created_by: viewer.id })
    .select("id, code")
    .single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "application.created", "applications", data.id, { code: data.code, customer: customer.id });
  revalidatePath("/crm", "layout");
  await flash(`Application ${data.code} created.`);
  redirect(`/crm/applications/${data.id}`);
}

export async function updateApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("applications.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const parsed = appSchema.safeParse(formValues(formData, APP_KEYS));
  const config = await getCrmConfig();
  const custom = parseCustomFields(formData, config.customFields.filter((f) => f.entity === "application"));
  if (!parsed.success || !custom.ok) return { ...INVALID, fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...(custom.ok ? {} : custom.errors) } };
  if (!config.options.application_status.some((o) => o.key === parsed.data.status)) return { status: "error", fieldErrors: { status: "Choose a status" } };
  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_applications").select("*").eq("id", id.data).maybeSingle();
  if (!before) return DENIED;
  const row = { ...appRow(parsed.data), custom_fields: custom.values };
  const changes = diff(before, row);
  if (!Object.keys(changes).length && !parsed.data.status_note) return { status: "success", message: "No changes." };
  const { error } = await supabase.from("crm_applications").update(row).eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (parsed.data.status_note) {
    // Attach the note to the history entry the trigger just wrote (or add one).
    const { data: last } = await supabase.from("crm_application_history").select("id, to_status, note").eq("application_id", id.data).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (changes.status && last && !last.note) await createAdminNote(last.id, parsed.data.status_note);
    else await createAdminHistory(id.data, viewer.id, before.status, parsed.data.status, parsed.data.status_note);
  }
  await crmAudit(viewer, changes.status ? "application.status_changed" : "application.updated", "applications", id.data, changes);
  revalidatePath(`/crm/applications/${id.data}`);
  return { status: "success", message: changes.status ? "Application updated — status history recorded." : "Application updated." };
}

// History rows are trigger-written (no insert policy for staff); notes are added with the service role after the RLS update above succeeded.
async function createAdminNote(historyId: string, note: string) {
  await createAdminClient().from("crm_application_history").update({ note }).eq("id", historyId);
}
async function createAdminHistory(applicationId: string, actorId: string, from: string, to: string, note: string) {
  await createAdminClient().from("crm_application_history").insert({ application_id: applicationId, actor_id: actorId, from_status: from, to_status: to, note });
}

export async function deleteApplication(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("applications.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: app } = await supabase.from("crm_applications").select("id, code, customer_id").eq("id", id.data).maybeSingle();
  if (!app) return DENIED;
  const { error } = await supabase.from("crm_applications").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await crmAudit(viewer, "application.deleted", "applications", id.data, { code: app.code, reason: formData.get("reason") || null });
  revalidatePath("/crm", "layout");
  await flash(`Application ${app.code} deleted.`);
  redirect(`/crm/customers/${app.customer_id}?tab=applications`);
}
