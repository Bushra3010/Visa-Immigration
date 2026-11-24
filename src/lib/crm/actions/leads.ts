"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notifyInApp } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { can, crmAudit, crmAuthorize, dbErrorMessage, DENIED, diff, FAILED, INVALID, type CrmViewer } from "../auth";
import { getCrmConfig } from "../config";
import { istDateTime } from "../dates";
import { flash } from "../flash";
import { formValues, money, nullify, optDate, optEmail, optPhone, optText, optTime, optUuid, parseCustomFields, phone, reqText } from "../schemas";

const LEAD_KEYS = [
  "full_name", "mobile", "whatsapp", "email", "date_of_birth", "gender", "nationality", "current_city", "current_country",
  "visa_type", "destination_country", "purpose_of_travel", "preferred_travel_date", "passport_available", "passport_number", "passport_expiry",
  "previous_visa_history", "visa_rejection_history", "education_employment", "additional_requirements",
  "source", "campaign_name", "reference", "assigned_counsellor_id", "temperature", "stage_id", "follow_up_date", "follow_up_time", "allow_duplicate",
];

const leadSchema = z.object({
  full_name: reqText("Full name", 120).pipe(z.string().min(2, "Enter the full name")),
  mobile: phone,
  whatsapp: optPhone,
  email: optEmail,
  date_of_birth: optDate,
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  nationality: optText(80),
  current_city: optText(80),
  current_country: optText(80),
  visa_type: optText(60),
  destination_country: optText(60),
  purpose_of_travel: optText(300),
  preferred_travel_date: optDate,
  passport_available: z.enum(["yes", "no"]).optional(),
  passport_number: z.string().trim().regex(/^[A-Za-z0-9]{5,20}$/, "Use 5–20 letters/digits").optional(),
  passport_expiry: optDate,
  previous_visa_history: optText(2000),
  visa_rejection_history: optText(2000),
  education_employment: optText(2000),
  additional_requirements: optText(2000),
  source: reqText("Lead source", 60),
  campaign_name: optText(120),
  reference: optText(120),
  assigned_counsellor_id: optUuid,
  temperature: z.enum(["hot", "warm", "cold"]),
  stage_id: optUuid,
  follow_up_date: optDate,
  follow_up_time: optTime,
  allow_duplicate: z.literal("on").optional(),
});

type LeadInput = z.infer<typeof leadSchema>;

function toRow(d: LeadInput) {
  const { follow_up_date: _fd, follow_up_time: _ft, allow_duplicate: _ad, passport_available, ...rest } = d;
  return nullify({
    ...rest,
    email: rest.email?.toLowerCase(),
    passport_number: rest.passport_number?.toUpperCase(),
    passport_available: passport_available === undefined ? undefined : passport_available === "yes",
  });
}

const digits10 = (v: string) => v.replace(/\D/g, "").slice(-10);

/** Finds existing leads with the same phone (last 10 digits) or email. Uses the service role so hidden duplicates are caught too. */
async function findDuplicates(mobile: string, email: string | undefined, excludeId?: string) {
  const db = createAdminClient();
  const filters = [`mobile_digits.eq.${digits10(mobile)}`];
  if (email) filters.push(`email.eq.${email.toLowerCase().replace(/[,()]/g, "")}`);
  let q = db.from("leads").select("id, code, full_name, mobile, email, assigned_counsellor_id, created_at").or(filters.join(",")).limit(5);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return data ?? [];
}

async function scheduleLeadFollowUp(viewer: CrmViewer, leadId: string, leadName: string, assignee: string, date: string, time?: string) {
  const supabase = await createClient();
  const due = istDateTime(date, time);
  const { data: existing } = await supabase.from("crm_follow_ups").select("id").eq("lead_id", leadId).eq("status", "pending").order("due_at").limit(1).maybeSingle();
  if (existing) {
    await supabase.from("crm_follow_ups").update({ due_at: due }).eq("id", existing.id);
  } else {
    await supabase.from("crm_follow_ups").insert({
      lead_id: leadId, assigned_to: assignee === viewer.id || can(viewer, "leads.assign") ? assignee : viewer.id,
      created_by: viewer.id, type: "call", title: `Follow up with ${leadName}`, due_at: due,
    });
  }
}

async function notifyAssignment(assignee: string | null | undefined, viewer: CrmViewer, lead: { id: string; code: string; full_name: string }) {
  if (!assignee || assignee === viewer.id) return;
  const config = await getCrmConfig();
  if (config.notifications.lead_assigned === false) return;
  await notifyInApp(assignee, "lead_assigned", { leadId: lead.id, reference: lead.code, name: lead.full_name, by: viewer.fullName, crm: true });
}

function parseLead(formData: FormData) {
  return leadSchema.safeParse(formValues(formData, LEAD_KEYS));
}

export async function createLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("leads.create");
  if (!viewer) return DENIED;
  const parsed = parseLead(formData);
  const config = await getCrmConfig();
  const custom = parseCustomFields(formData, config.customFields.filter((f) => f.entity === "lead"));
  if (!parsed.success || !custom.ok) {
    return { ...INVALID, fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...(custom.ok ? {} : custom.errors) } };
  }
  const d = parsed.data;

  if (!d.allow_duplicate) {
    const dupes = await findDuplicates(d.mobile, d.email);
    if (dupes.length) {
      const list = dupes.map((x) => `${x.code} (${x.full_name})`).join(", ");
      return { status: "error", message: `Possible duplicate: ${list} already uses this phone or email. Tick “Save anyway” if this is a different person.`, data: { duplicates: dupes.map((x) => ({ id: x.id, code: x.code, name: x.full_name })) } };
    }
  }

  // Without assign permission, a new lead is assigned to its creator.
  const assignee = can(viewer, "leads.assign") ? d.assigned_counsellor_id ?? viewer.id : viewer.id;
  const supabase = await createClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...toRow(d), assigned_counsellor_id: assignee, created_by: viewer.id, custom_fields: custom.values })
    .select("id, code, full_name")
    .single();
  if (error || !lead) {
    console.error("CRM lead create failed", error);
    return { status: "error", message: dbErrorMessage(error) };
  }

  if (d.follow_up_date) await scheduleLeadFollowUp(viewer, lead.id, lead.full_name, assignee, d.follow_up_date, d.follow_up_time);
  await Promise.all([
    notifyAssignment(assignee, viewer, lead),
    crmAudit(viewer, "lead.created", "leads", lead.id, { code: lead.code, ...toRow(d) }),
  ]);
  revalidatePath("/crm", "layout");
  await flash(`Lead ${lead.code} created.`);
  redirect(`/crm/leads/${lead.id}`);
}

export async function updateLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("leads.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const parsed = parseLead(formData);
  const config = await getCrmConfig();
  const custom = parseCustomFields(formData, config.customFields.filter((f) => f.entity === "lead"));
  if (!parsed.success || !custom.ok) {
    return { ...INVALID, fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...(custom.ok ? {} : custom.errors) } };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("leads").select("*").eq("id", id.data).maybeSingle();
  if (!before) return DENIED;

  if (!d.allow_duplicate && (digits10(d.mobile) !== before.mobile_digits || (d.email?.toLowerCase() ?? null) !== (before.email ?? null))) {
    const dupes = await findDuplicates(d.mobile, d.email, id.data);
    if (dupes.length) {
      return { status: "error", message: `Possible duplicate: ${dupes.map((x) => `${x.code} (${x.full_name})`).join(", ")} already uses this phone or email. Tick “Save anyway” to keep it.` };
    }
  }

  const row: Record<string, unknown> = { ...toRow(d), custom_fields: custom.values };
  delete row.stage_id; // stage moves go through moveLeadStage (history + rules)
  const canChangeAssignee = before.assigned_counsellor_id ? can(viewer, "leads.reassign") : can(viewer, "leads.assign") || can(viewer, "leads.reassign");
  const newAssignee = canChangeAssignee && d.assigned_counsellor_id && d.assigned_counsellor_id !== before.assigned_counsellor_id ? d.assigned_counsellor_id : null;
  delete row.assigned_counsellor_id; // assignment goes through crm_assign_leads below

  const changes = diff(before, row);
  if (Object.keys(changes).length) {
    const { error } = await supabase.from("leads").update(row).eq("id", id.data);
    if (error) {
      console.error("CRM lead update failed", error);
      return { status: "error", message: dbErrorMessage(error) };
    }
    await supabase.from("crm_lead_history").insert({ lead_id: id.data, actor_id: viewer.id, event: "updated", changes });
    await crmAudit(viewer, "lead.updated", "leads", id.data, changes);
  }
  if (newAssignee) {
    const { error } = await supabase.rpc("crm_assign_leads", { p_lead_ids: [id.data], p_user: newAssignee });
    if (error) return { status: "error", message: `Details saved, but the assignment failed: ${dbErrorMessage(error)}` };
    await crmAudit(viewer, before.assigned_counsellor_id ? "lead.reassigned" : "lead.assigned", "leads", id.data, { from: before.assigned_counsellor_id, to: newAssignee });
    await notifyAssignment(newAssignee, viewer, before);
  }

  if (d.follow_up_date) {
    const due = istDateTime(d.follow_up_date, d.follow_up_time);
    if (!before.next_follow_up_at || new Date(before.next_follow_up_at).getTime() !== new Date(due).getTime()) {
      await scheduleLeadFollowUp(viewer, id.data, d.full_name, newAssignee ?? before.assigned_counsellor_id ?? viewer.id, d.follow_up_date, d.follow_up_time);
    }
  }
  revalidatePath("/crm", "layout");
  await flash("Lead updated.");
  redirect(`/crm/leads/${id.data}`);
}

export async function moveLeadStage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("leads.edit");
  if (!viewer || !(can(viewer, "pipeline.edit") || can(viewer, "leads.edit"))) return DENIED;
  const parsed = z.object({ leadId: z.uuid(), stageId: z.uuid(), note: optText(1000), lostReason: optText(300) }).safeParse(formValues(formData, ["leadId", "stageId", "note", "lostReason"]));
  if (!parsed.success) return FAILED;
  const { leadId, stageId, note, lostReason } = parsed.data;

  const config = await getCrmConfig();
  const stage = config.stageById.get(stageId);
  if (!stage || !stage.is_active) return { status: "error", message: "That stage is no longer available." };

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id, stage_id, converted_at").eq("id", leadId).maybeSingle();
  if (!lead) return DENIED;
  if (lead.stage_id === stageId) return { status: "success" };
  if (stage.is_won && !lead.converted_at) {
    return { status: "error", message: "Use “Convert to customer” to move a lead to Converted / Won.", data: { needsConversion: true } };
  }

  const update: Record<string, unknown> = { stage_id: stageId };
  if (stage.is_lost && lostReason) update.lost_reason = lostReason;
  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (note || lostReason) {
    await supabase.from("lead_activities").insert({ lead_id: leadId, actor_id: viewer.id, kind: "comment", body: [lostReason && `Reason: ${lostReason}`, note].filter(Boolean).join("\n") });
  }
  await crmAudit(viewer, "lead.stage_changed", "leads", leadId, { from: config.stageById.get(lead.stage_id)?.key ?? null, to: stage.key });
  revalidatePath("/crm", "layout");
  return { status: "success", message: `Moved to ${stage.name}.` };
}

export async function assignLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer || !(can(viewer, "leads.assign") || can(viewer, "leads.reassign"))) return DENIED;
  const parsed = z.object({ leadIds: z.array(z.uuid()).min(1).max(200), userId: z.uuid() }).safeParse({
    leadIds: formData.getAll("leadId").map(String),
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { status: "error", message: "Choose an employee." };
  const config = await getCrmConfig();
  const target = config.staff.find((s) => s.id === parsed.data.userId && s.crm_active && s.is_active);
  if (!target) return { status: "error", message: "That employee isn't active." };

  const supabase = await createClient();
  const { data: leads } = await supabase.from("leads").select("id, code, full_name, assigned_counsellor_id").in("id", parsed.data.leadIds);
  if (!leads?.length) return DENIED;
  const changed = leads.filter((l) => l.assigned_counsellor_id !== target.id);
  if (!changed.length) return { status: "success", message: `Already assigned to ${target.full_name}.` };
  if (changed.some((l) => l.assigned_counsellor_id) && !can(viewer, "leads.reassign")) return { status: "error", message: "You can assign unassigned leads only. Reassigning needs the Reassign permission." };

  // RPC: checks visibility + permissions, moves pending follow-ups, and works even when the new owner is outside the caller's own scope.
  const { error } = await supabase.rpc("crm_assign_leads", { p_lead_ids: changed.map((l) => l.id), p_user: target.id });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  await Promise.all(changed.map((l) => Promise.all([
    crmAudit(viewer, l.assigned_counsellor_id ? "lead.reassigned" : "lead.assigned", "leads", l.id, { from: l.assigned_counsellor_id, to: target.id }),
    notifyAssignment(target.id, viewer, l),
  ])));
  revalidatePath("/crm", "layout");
  return { status: "success", message: changed.length === 1 ? `Assigned to ${target.full_name}.` : `${changed.length} leads assigned to ${target.full_name}.` };
}

export async function deleteLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("leads.delete");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id, code, full_name, converted_at").eq("id", id.data).maybeSingle();
  if (!lead) return DENIED;
  if (lead.converted_at) return { status: "error", message: "Converted leads can't be deleted — their history belongs to the customer record." };

  const { data: docs } = await supabase.from("crm_documents").select("storage_path").eq("lead_id", id.data);
  const { error } = await supabase.from("leads").delete().eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (docs?.length) await createAdminClient().storage.from("crm-documents").remove(docs.map((d) => d.storage_path));
  await crmAudit(viewer, "lead.deleted", "leads", id.data, { code: lead.code, name: lead.full_name, reason: formData.get("reason") || null });
  revalidatePath("/crm", "layout");
  await flash(`Lead ${lead.code} deleted.`);
  redirect("/crm/leads");
}

export async function addLeadActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("leads.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      leadId: z.uuid(),
      kind: z.enum(["note", "call", "whatsapp", "email", "comment", "meeting"]),
      body: reqText("Details", 4000),
      direction: z.enum(["inbound", "outbound"]).optional(),
      outcome: optText(80),
      duration: z.coerce.number().int().min(0).max(600).optional(),
      markContacted: z.literal("on").optional(),
    })
    .safeParse(formValues(formData, ["leadId", "kind", "body", "direction", "outcome", "duration", "markContacted"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const metadata = nullify({ direction: d.direction, outcome: d.outcome, duration_minutes: d.duration });
  const { error } = await supabase.from("lead_activities").insert({ lead_id: d.leadId, actor_id: viewer.id, kind: d.kind, body: d.body, metadata });
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (["call", "whatsapp", "email", "meeting"].includes(d.kind) || d.markContacted) {
    await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", d.leadId);
  }
  revalidatePath(`/crm/leads/${d.leadId}`);
  return { status: "success", message: d.kind === "call" ? "Call logged." : d.kind === "whatsapp" ? "WhatsApp message logged." : "Saved." };
}

export async function convertLead(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("customers.create", "leads.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      leadId: z.uuid(),
      package_amount: money,
      consultant_id: optUuid,
      visa_category: optText(60),
      destination_country: optText(60),
      application_ref: optText(80),
      notes: optText(2000),
      create_application: z.literal("on").optional(),
    })
    .safeParse(formValues(formData, ["leadId", "package_amount", "consultant_id", "visa_category", "destination_country", "application_ref", "notes", "create_application"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { data: customerId, error } = await supabase.rpc("crm_convert_lead", {
    p_lead_id: d.leadId,
    p_package_amount: d.package_amount,
    p_consultant_id: d.consultant_id ?? null,
    p_visa_category: d.visa_category ?? null,
    p_destination_country: d.destination_country ?? null,
    p_application_ref: d.application_ref ?? null,
    p_notes: d.notes ?? null,
  });
  if (error || !customerId) {
    console.error("Lead conversion failed", error);
    return { status: "error", message: dbErrorMessage(error, "Could not convert this lead.") };
  }

  let appNote = "";
  if (d.create_application && can(viewer, "applications.create")) {
    const { data: lead } = await supabase.from("leads").select("passport_number, passport_expiry").eq("id", d.leadId).maybeSingle();
    const { data: customer } = await supabase.from("crm_customers").select("visa_category, destination_country, consultant_id").eq("id", customerId).single();
    const { error: appError } = await supabase.from("crm_applications").insert({
      customer_id: customerId, lead_id: d.leadId, consultant_id: customer?.consultant_id ?? null,
      visa_type: customer?.visa_category ?? null, destination_country: customer?.destination_country ?? null,
      passport_number: lead?.passport_number ?? null, passport_expiry_date: lead?.passport_expiry ?? null,
      status: "not_started", created_by: viewer.id,
    });
    appNote = appError ? " (the visa application couldn't be created — add it from the customer page)" : " and a visa application was opened";
  }
  await crmAudit(viewer, "lead.converted", "customers", customerId as string, { leadId: d.leadId, package_amount: d.package_amount });
  revalidatePath("/crm", "layout");
  await flash(`Lead converted to customer${appNote}.`);
  redirect(`/crm/customers/${customerId}`);
}
