"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notifyInApp } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { can, crmAudit, crmAuthorize, dbErrorMessage, DENIED, FAILED, INVALID } from "../auth";
import { getCrmConfig } from "../config";
import { istDateTime } from "../dates";
import { formValues, optText, optTime, optUuid, reqText } from "../schemas";

const TYPES = ["call", "whatsapp", "email", "meeting", "task", "other"] as const;

export async function createFollowUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      lead_id: optUuid,
      customer_id: optUuid,
      assigned_to: optUuid,
      type: z.enum(TYPES),
      title: reqText("Title", 200),
      notes: optText(2000),
      date: z.string({ error: "Pick a date" }).regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
      time: optTime,
    })
    .refine((v) => v.lead_id || v.customer_id, { path: ["title"], message: "Link the follow-up to a lead or customer" })
    .safeParse(formValues(formData, ["lead_id", "customer_id", "assigned_to", "type", "title", "notes", "date", "time"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  if (d.lead_id ? !can(viewer, "leads.edit") : !can(viewer, "customers.edit")) return DENIED;

  const assignee = d.assigned_to && can(viewer, "leads.assign") ? d.assigned_to : viewer.id;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_follow_ups")
    .insert({
      lead_id: d.lead_id ?? null, customer_id: d.customer_id ?? null, assigned_to: assignee, created_by: viewer.id,
      type: d.type, title: d.title, notes: d.notes ?? null, due_at: istDateTime(d.date, d.time),
    })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error) };

  if (d.lead_id) await supabase.from("crm_lead_history").insert({ lead_id: d.lead_id, actor_id: viewer.id, event: "follow_up", note: `Follow-up scheduled: ${d.title}`, changes: { due_at: istDateTime(d.date, d.time), assigned_to: assignee } });
  if (assignee !== viewer.id && (await getCrmConfig()).notifications.follow_up_reminders !== false) {
    await notifyInApp(assignee, "lead_assigned", { followUpId: data.id, title: d.title, by: viewer.fullName, crm: true });
  }
  await crmAudit(viewer, "follow_up.created", "follow_ups", data.id, { ...d, assigned_to: assignee });
  revalidatePath("/crm", "layout");
  return { status: "success", message: "Follow-up scheduled." };
}

export async function setFollowUpStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(["pending", "completed", "missed", "cancelled"]), outcome: optText(1000) })
    .safeParse(formValues(formData, ["id", "status", "outcome"]));
  if (!parsed.success) return FAILED;
  const { id, status, outcome } = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("crm_follow_ups").select("id, lead_id, title, status").eq("id", id).maybeSingle();
  if (!before) return DENIED;
  const { error } = await supabase
    .from("crm_follow_ups")
    .update({
      status,
      outcome: outcome ?? null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      completed_by: status === "completed" ? viewer.id : null,
    })
    .eq("id", id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (before.lead_id && status === "completed") {
    await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", before.lead_id);
    if (outcome) await supabase.from("lead_activities").insert({ lead_id: before.lead_id, actor_id: viewer.id, kind: "note", body: `Follow-up “${before.title}” completed: ${outcome}` });
  }
  await crmAudit(viewer, `follow_up.${status}`, "follow_ups", id, { from: before.status, to: status, outcome });
  revalidatePath("/crm", "layout");
  return { status: "success", message: status === "completed" ? "Marked as completed." : status === "missed" ? "Marked as missed." : status === "pending" ? "Reopened." : "Cancelled." };
}

export async function rescheduleFollowUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"), time: optTime, assigned_to: optUuid, notes: optText(2000) })
    .safeParse(formValues(formData, ["id", "date", "time", "assigned_to", "notes"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const update: Record<string, unknown> = { due_at: istDateTime(d.date, d.time), status: "pending", completed_at: null, completed_by: null };
  if (d.notes !== undefined) update.notes = d.notes;
  if (d.assigned_to && can(viewer, "leads.assign")) update.assigned_to = d.assigned_to;
  const supabase = await createClient();
  const { error, count } = await supabase.from("crm_follow_ups").update(update, { count: "exact" }).eq("id", d.id);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!count) return DENIED;
  await crmAudit(viewer, "follow_up.rescheduled", "follow_ups", d.id, update);
  revalidatePath("/crm", "layout");
  return { status: "success", message: "Follow-up rescheduled." };
}

export async function deleteFollowUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const supabase = await createClient();
  const { error, count } = await supabase.from("crm_follow_ups").delete({ count: "exact" }).eq("id", id.data);
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!count) return DENIED;
  await crmAudit(viewer, "follow_up.deleted", "follow_ups", id.data);
  revalidatePath("/crm", "layout");
  return { status: "success", message: "Follow-up deleted." };
}
