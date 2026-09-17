"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, type Viewer } from "@/lib/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { APPLICATION_STATUSES, DOCUMENT_TYPES, LEAD_STATUSES } from "@/lib/immigration/status";
import { notify, notifyInApp } from "@/lib/notifications";
import { canAccess, ROLES, type AdminSection } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fromBusinessInput } from "@/lib/utils";

/**
 * Admin Panel mutations (PRD §8). Every action checks the section permission
 * (§9) and writes through the user's RLS-bound client, so the database
 * enforces the same rules (e.g. counsellors only touch assigned leads).
 * The service-role client is used only for audit logs and notifications.
 */

type Ok = FormState;
const DENIED: Ok = { status: "error", message: "You don't have permission to do that." };
const FAILED: Ok = { status: "error", message: "Could not save changes. Please try again." };

async function authorize(section: AdminSection): Promise<Viewer | null> {
  const viewer = await getViewer();
  return viewer && canAccess(viewer.role, section) ? viewer : null;
}

async function audit(actor: Viewer, action: string, entity: string, entityId: string, changes?: unknown) {
  const { error } = await createAdminClient().from("audit_logs").insert({ actor_id: actor.id, action, entity, entity_id: entityId, changes });
  if (error) console.error("Audit log failed", error);
}

const blank = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : String(v));
const dateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/).optional();

// ---------------------------------------------------------------------------
// Leads (§6.5, §6.6)
// ---------------------------------------------------------------------------

export async function updateLead(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("leads");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      leadId: z.uuid(),
      status: z.enum(LEAD_STATUSES),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      nextFollowUpAt: dateTime,
      assignedCounsellorId: z.uuid().optional(),
      note: z.string().trim().max(2000).optional(),
      contacted: z.literal("on").optional(),
    })
    .safeParse({
      leadId: formData.get("leadId"),
      status: formData.get("status"),
      priority: formData.get("priority"),
      nextFollowUpAt: blank(formData.get("nextFollowUpAt")),
      assignedCounsellorId: blank(formData.get("assignedCounsellorId")),
      note: blank(formData.get("note")),
      contacted: blank(formData.get("contacted")),
    });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), message: "Check the form." };
  const d = parsed.data;
  const supabase = await createClient();

  const { data: before } = await supabase.from("leads").select("status, assigned_counsellor_id").eq("id", d.leadId).maybeSingle();
  if (!before) return DENIED;

  const update: Record<string, unknown> = {
    status: d.status,
    priority: d.priority,
    next_follow_up_at: d.nextFollowUpAt ? fromBusinessInput(d.nextFollowUpAt) : null,
  };
  if (d.contacted) update.last_contacted_at = new Date().toISOString();
  // Only admins may reassign (§6.6); counsellors keep their own leads.
  const canAssign = viewer.role === "super_admin" || viewer.role === "immigration_admin";
  if (canAssign && d.assignedCounsellorId !== undefined) update.assigned_counsellor_id = d.assignedCounsellorId;

  const { error } = await supabase.from("leads").update(update).eq("id", d.leadId);
  if (error) {
    console.error("Lead update failed", error);
    return FAILED;
  }

  const activities: { lead_id: string; actor_id: string; kind: string; body: string; metadata?: unknown }[] = [];
  if (before.status !== d.status) activities.push({ lead_id: d.leadId, actor_id: viewer.id, kind: "status_change", body: `${before.status} → ${d.status}` });
  if (d.note) activities.push({ lead_id: d.leadId, actor_id: viewer.id, kind: d.contacted ? "call" : "note", body: d.note });
  if (activities.length) await supabase.from("lead_activities").insert(activities);

  if (canAssign && d.assignedCounsellorId && d.assignedCounsellorId !== before.assigned_counsellor_id) {
    await notifyInApp(d.assignedCounsellorId, "lead_assigned", { leadId: d.leadId });
  }
  await audit(viewer, "lead.update", "lead", d.leadId, update);
  revalidatePath(`/admin/leads/${d.leadId}`);
  revalidatePath("/admin/leads");
  return { status: "success", message: "Lead updated." };
}

/** Converts a qualified lead into an application for a registered customer. */
export async function convertLeadToApplication(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("applications");
  if (!viewer || viewer.role === "documentation") return DENIED;
  const parsed = z.object({ leadId: z.uuid(), visaServiceSlug: z.string().trim().max(80).optional() }).safeParse({ leadId: formData.get("leadId"), visaServiceSlug: blank(formData.get("visaServiceSlug")) });
  if (!parsed.success) return FAILED;

  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("id, email, user_id, destination_country, assigned_counsellor_id, full_name").eq("id", parsed.data.leadId).maybeSingle();
  if (!lead) return DENIED;

  let userId = lead.user_id;
  if (!userId) {
    const { data: profile } = await createAdminClient().from("profiles").select("id").eq("email", lead.email.toLowerCase()).maybeSingle();
    userId = profile?.id ?? null;
  }
  if (!userId) return { status: "error", message: `${lead.full_name} needs to register with ${lead.email} before an application can be opened.` };
  if (!lead.destination_country) return { status: "error", message: "Set the lead's destination country first." };

  // Counsellors create applications through the admin client, scoped to their own lead (checked above via RLS read).
  const db = createAdminClient();
  const { data: app, error } = await db
    .from("applications")
    .insert({
      user_id: userId,
      lead_id: lead.id,
      counsellor_id: lead.assigned_counsellor_id ?? (viewer.role === "counsellor" ? viewer.id : null),
      destination_country: lead.destination_country,
      visa_service_slug: parsed.data.visaServiceSlug ?? null,
      status: lead.assigned_counsellor_id ? "counsellor_assigned" : "eligibility_checked",
      next_action: "Upload the requested documents",
    })
    .select("id, code")
    .single();
  if (error || !app) {
    console.error("Application create failed", error);
    return FAILED;
  }
  await Promise.all([
    db.from("leads").update({ status: "application_in_progress", user_id: userId }).eq("id", lead.id),
    db.from("application_events").insert({ application_id: app.id, actor_id: viewer.id, status: "counsellor_assigned", title: "Application opened", body: "Your counsellor has opened your application." }),
    notifyInApp(userId, "application_updated", { reference: app.code, event: "opened" }),
    audit(viewer, "application.create", "application", app.id, { leadId: lead.id }),
  ]);
  redirect(`/admin/applications/${app.code}`);
}

// ---------------------------------------------------------------------------
// Applications (§6.10, §7.4)
// ---------------------------------------------------------------------------

export async function updateApplication(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("applications");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      applicationId: z.uuid(),
      status: z.enum(APPLICATION_STATUSES),
      nextAction: z.string().trim().max(300).optional(),
      counsellorRemarks: z.string().trim().max(2000).optional(),
      updateTitle: z.string().trim().max(160).optional(),
      updateBody: z.string().trim().max(2000).optional(),
      readyToTravel: z.literal("on").optional(),
      notifyCustomer: z.literal("on").optional(),
    })
    .safeParse({
      applicationId: formData.get("applicationId"),
      status: formData.get("status"),
      nextAction: blank(formData.get("nextAction")),
      counsellorRemarks: blank(formData.get("counsellorRemarks")),
      updateTitle: blank(formData.get("updateTitle")),
      updateBody: blank(formData.get("updateBody")),
      readyToTravel: blank(formData.get("readyToTravel")),
      notifyCustomer: blank(formData.get("notifyCustomer")),
    });
  if (!parsed.success) return { status: "error", message: "Check the form.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase.from("applications").select("status, user_id, code, lead_id").eq("id", d.applicationId).maybeSingle();
  if (!before) return DENIED;

  const decided = ["approved", "rejected"].includes(d.status);
  const update = {
    status: d.status,
    next_action: d.nextAction ?? null,
    counsellor_remarks: d.counsellorRemarks ?? null,
    ready_to_travel: d.status === "approved" || Boolean(d.readyToTravel),
    decision_at: decided && !["approved", "rejected"].includes(before.status) ? new Date().toISOString() : undefined,
  };
  const { error } = await supabase.from("applications").update(update).eq("id", d.applicationId);
  if (error) {
    console.error("Application update failed", error);
    return FAILED;
  }

  const statusChanged = before.status !== d.status;
  if (statusChanged || d.updateTitle) {
    await supabase.from("application_events").insert({
      application_id: d.applicationId,
      actor_id: viewer.id,
      status: d.status,
      title: d.updateTitle ?? `Status updated: ${d.status.replace(/_/g, " ")}`,
      body: d.updateBody ?? null,
    });
  }
  if (statusChanged && before.lead_id && decided) {
    await createAdminClient().from("leads").update({ status: d.status }).eq("id", before.lead_id);
  }
  if (d.notifyCustomer || statusChanged) {
    const { data: customer } = await createAdminClient().from("profiles").select("email").eq("id", before.user_id).single();
    await Promise.all([
      notifyInApp(before.user_id, "application_updated", { reference: before.code, status: d.status }),
      customer?.email && notify({ template: "application_updated", email: customer.email, userId: before.user_id, payload: { reference: before.code, status: d.status, title: d.updateTitle } }),
    ]);
  }
  await audit(viewer, "application.update", "application", d.applicationId, update);
  revalidatePath(`/admin/applications/${before.code}`);
  return { status: "success", message: "Application updated." };
}

export async function requestDocument(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("applications");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ applicationId: z.uuid(), docType: z.enum(DOCUMENT_TYPES.map((t) => t.value) as [string, ...string[]]), label: z.string().trim().max(120).optional(), note: z.string().trim().max(500).optional() })
    .safeParse({ applicationId: formData.get("applicationId"), docType: formData.get("docType"), label: blank(formData.get("label")), note: blank(formData.get("note")) });
  if (!parsed.success) return { status: "error", message: "Choose a document type." };

  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("user_id, code").eq("id", parsed.data.applicationId).maybeSingle();
  if (!app) return DENIED;
  const { data: doc, error } = await supabase
    .from("documents")
    .insert({ application_id: parsed.data.applicationId, user_id: app.user_id, doc_type: parsed.data.docType, label: parsed.data.label, status: "requested", requested_by: viewer.id })
    .select("id")
    .single();
  if (error || !doc) {
    console.error("Document request failed", error);
    return FAILED;
  }
  if (parsed.data.note) await supabase.from("document_remarks").insert({ document_id: doc.id, author_id: viewer.id, body: parsed.data.note });

  const { data: customer } = await createAdminClient().from("profiles").select("email").eq("id", app.user_id).single();
  await Promise.all([
    notifyInApp(app.user_id, "document_requested", { reference: app.code, docType: parsed.data.docType }),
    customer?.email && notify({ template: "document_requested", email: customer.email, userId: app.user_id, payload: { reference: app.code, docType: parsed.data.docType } }),
  ]);
  revalidatePath(`/admin/applications/${app.code}`);
  return { status: "success", message: "Document requested from customer." };
}

export async function reviewDocument(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("documents");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ documentId: z.uuid(), decision: z.enum(["under_review", "approved", "rejected", "reupload_required"]), remark: z.string().trim().max(1000).optional() })
    .safeParse({ documentId: formData.get("documentId"), decision: formData.get("decision"), remark: blank(formData.get("remark")) });
  if (!parsed.success) return FAILED;
  if (["rejected", "reupload_required"].includes(parsed.data.decision) && !parsed.data.remark) {
    return { status: "error", message: "Add a remark so the customer knows what to fix." };
  }

  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .update({ status: parsed.data.decision, reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
    .eq("id", parsed.data.documentId)
    .select("user_id, applications(code)")
    .maybeSingle();
  if (error || !doc) return DENIED;
  if (parsed.data.remark) await supabase.from("document_remarks").insert({ document_id: parsed.data.documentId, author_id: viewer.id, body: parsed.data.remark });

  if (parsed.data.decision !== "under_review") {
    await notifyInApp(doc.user_id, "document_requested", { documentId: parsed.data.documentId, decision: parsed.data.decision });
  }
  await audit(viewer, "document.review", "document", parsed.data.documentId, parsed.data);
  revalidatePath("/admin/documents");
  const code = (doc.applications as unknown as { code: string } | null)?.code;
  if (code) revalidatePath(`/admin/applications/${code}`);
  return { status: "success", message: "Document updated." };
}

export async function createTravelRequirement(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("applications");
  if (!viewer) return DENIED;
  const parsed = z
    .object({
      applicationId: z.uuid(),
      origin: z.string().trim().max(60).optional(),
      destination: z.string().trim().max(60).optional(),
      departOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      returnOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      needsHotel: z.literal("on").optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries([...formData.entries()].map(([k, v]) => [k, blank(v)])));
  if (!parsed.success) return { status: "error", message: "Check the travel details." };
  const supabase = await createClient();
  const { data: app } = await supabase.from("applications").select("user_id, code").eq("id", parsed.data.applicationId).maybeSingle();
  if (!app) return DENIED;
  const { error } = await supabase.from("travel_requirements").insert({
    application_id: parsed.data.applicationId,
    user_id: app.user_id,
    created_by: viewer.id,
    origin: parsed.data.origin,
    destination: parsed.data.destination,
    depart_on: parsed.data.departOn,
    return_on: parsed.data.returnOn,
    needs_hotel: Boolean(parsed.data.needsHotel),
    notes: parsed.data.notes,
  });
  if (error) return FAILED;
  revalidatePath(`/admin/applications/${app.code}`);
  return { status: "success", message: "Travel requirement saved." };
}

export async function updateConsultation(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("consultations");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ consultationId: z.uuid(), status: z.enum(["requested", "confirmed", "completed", "cancelled", "no_show"]), preferredAt: dateTime })
    .safeParse({ consultationId: formData.get("consultationId"), status: formData.get("status"), preferredAt: blank(formData.get("preferredAt")) });
  if (!parsed.success) return FAILED;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consultations")
    .update({ status: parsed.data.status, ...(parsed.data.preferredAt ? { preferred_at: fromBusinessInput(parsed.data.preferredAt) } : {}) })
    .eq("id", parsed.data.consultationId)
    .select("email, code, user_id")
    .maybeSingle();
  if (error || !data) return DENIED;
  if (parsed.data.status === "confirmed") {
    await notify({ template: "consultation_requested", email: data.email, userId: data.user_id, payload: { reference: data.code, status: "confirmed" } });
  }
  await audit(viewer, "consultation.update", "consultation", parsed.data.consultationId, parsed.data);
  revalidatePath("/admin/consultations");
  return { status: "success", message: "Consultation updated." };
}

// ---------------------------------------------------------------------------
// Users & counsellors (§8.2, §8.3) — super admin only for roles
// ---------------------------------------------------------------------------

export async function updateUserAccess(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("users");
  if (!viewer) return DENIED;
  const parsed = z.object({ userId: z.uuid(), role: z.enum(ROLES), isActive: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return FAILED;
  if (parsed.data.userId === viewer.id && (parsed.data.role !== "super_admin" || parsed.data.isActive === "false")) {
    return { status: "error", message: "You can't remove your own super admin access." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role, is_active: parsed.data.isActive === "true" }).eq("id", parsed.data.userId);
  if (error) return FAILED;
  if (parsed.data.role === "counsellor") {
    await createAdminClient().from("counsellors").upsert({ profile_id: parsed.data.userId }, { onConflict: "profile_id", ignoreDuplicates: true });
  }
  await audit(viewer, "user.access", "profile", parsed.data.userId, parsed.data);
  revalidatePath("/admin/users");
  return { status: "success", message: "Access updated." };
}

export async function updateCounsellor(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("counsellors");
  if (!viewer) return DENIED;
  const list = (k: string) => formData.getAll(k).map(String).filter(Boolean);
  const parsed = z
    .object({
      profileId: z.uuid(),
      countries: z.array(z.string().max(40)).max(50),
      visaCategories: z.array(z.string().max(40)).max(50),
      locations: z.array(z.string().max(60)).max(50),
      isAvailable: z.boolean(),
      maxActiveLeads: z.coerce.number().int().min(1).max(1000),
    })
    .safeParse({
      profileId: formData.get("profileId"),
      countries: list("countries"),
      visaCategories: list("visaCategories"),
      locations: String(formData.get("locations") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      isAvailable: formData.get("isAvailable") === "on",
      maxActiveLeads: formData.get("maxActiveLeads"),
    });
  if (!parsed.success) return { status: "error", message: "Check the form." };
  const supabase = await createClient();
  const { error } = await supabase.from("counsellors").update({
    countries: parsed.data.countries,
    visa_categories: parsed.data.visaCategories,
    locations: parsed.data.locations,
    is_available: parsed.data.isAvailable,
    max_active_leads: parsed.data.maxActiveLeads,
  }).eq("profile_id", parsed.data.profileId);
  if (error) return FAILED;
  await audit(viewer, "counsellor.update", "counsellor", parsed.data.profileId, parsed.data);
  revalidatePath("/admin/counsellors");
  return { status: "success", message: "Counsellor updated." };
}

// ---------------------------------------------------------------------------
// Markup rules (§8.6)
// ---------------------------------------------------------------------------

const markupSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  product: z.enum(["flight", "hotel", "package"]),
  markupType: z.enum(["fixed", "percentage"]),
  value: z.coerce.number().min(-100000).max(100000),
  destinationCountry: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  airlineCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2}$/).optional(),
  hotelStarRating: z.coerce.number().int().min(1).max(5).optional(),
  supplier: z.string().trim().max(40).optional(),
  isPromotional: z.boolean(),
  priority: z.coerce.number().int().min(0).max(1000),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  isActive: z.boolean(),
}).refine((v) => v.markupType !== "percentage" || Math.abs(v.value) <= 100, { path: ["value"], message: "Percentage must be between -100 and 100" });

export async function saveMarkupRule(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("markup");
  if (!viewer) return DENIED;
  const parsed = markupSchema.safeParse({
    id: blank(formData.get("id")),
    name: formData.get("name"),
    product: formData.get("product"),
    markupType: formData.get("markupType"),
    value: formData.get("value"),
    destinationCountry: blank(formData.get("destinationCountry")),
    airlineCode: blank(formData.get("airlineCode")),
    hotelStarRating: blank(formData.get("hotelStarRating")),
    supplier: blank(formData.get("supplier")),
    isPromotional: formData.get("isPromotional") === "on",
    priority: formData.get("priority") || 0,
    startsAt: blank(formData.get("startsAt")),
    endsAt: blank(formData.get("endsAt")),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  if (d.isPromotional && d.value > 0) return { status: "error", message: "Promotional discounts must be negative values.", fieldErrors: { value: "Use a negative value" } };

  const row = {
    name: d.name, product: d.product, markup_type: d.markupType, value: d.value,
    destination_country: d.destinationCountry ?? null, airline_code: d.airlineCode ?? null, hotel_star_rating: d.hotelStarRating ?? null,
    supplier: d.supplier ?? null, is_promotional: d.isPromotional, priority: d.priority,
    starts_at: d.startsAt ? fromBusinessInput(d.startsAt) : null, ends_at: d.endsAt ? fromBusinessInput(d.endsAt) : null,
    is_active: d.isActive,
  };
  const supabase = await createClient();
  const { data, error } = d.id
    ? await supabase.from("markup_rules").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("markup_rules").insert(row).select("id").single();
  if (error || !data) {
    console.error("Markup save failed", error);
    return FAILED;
  }
  await audit(viewer, d.id ? "markup.update" : "markup.create", "markup_rule", data.id, row);
  revalidatePath("/admin/markup");
  return { status: "success", message: "Markup rule saved." };
}
