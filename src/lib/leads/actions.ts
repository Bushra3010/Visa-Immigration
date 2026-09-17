"use server";

import { getViewer } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notify, notifyInApp } from "@/lib/notifications";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { consultationSchema, eligibilitySchema, enquirySchema, OBJECTIVE_TO_CATEGORY } from "./schemas";
import { scoreEligibility } from "./scoring";

type LeadResult = { reference: string; demo?: boolean };

const TOO_MANY = { status: "error", message: "Too many submissions. Please wait a few minutes and try again." } as const;
const SAVE_FAILED = { status: "error", message: "We couldn't save your request. Please try again or contact us directly." } as const;

function demoReference(prefix: string) {
  return `${prefix}-DEMO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

/** Honeypot: bots fill hidden fields humans never see. */
const isBot = (formData: FormData) => Boolean(formData.get("company_website"));

export async function submitEligibility(_prev: FormState<LeadResult>, formData: FormData): Promise<FormState<LeadResult>> {
  if (isBot(formData)) return { status: "success", data: { reference: demoReference("LD") } };
  if (!(await rateLimit("eligibility", 5, 10 * 60_000)).ok) return TOO_MANY;

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { status: "error", message: "Invalid submission." };
  }
  const parsed = eligibilitySchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please review the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;
  const outcome = scoreEligibility(input);
  const visaType = OBJECTIVE_TO_CATEGORY[input.destination.objective] ?? input.destination.objective;

  if (!isSupabaseAdminConfigured()) {
    console.info("[eligibility] Supabase not configured — lead not persisted", { email: input.personal.email, outcome });
    return { status: "success", data: { reference: demoReference("LD"), demo: true } };
  }

  const viewer = await getViewer();
  const supabase = createAdminClient();
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      user_id: viewer?.id ?? null,
      full_name: input.personal.fullName,
      email: input.personal.email.toLowerCase(),
      mobile: input.personal.mobile,
      country_of_residence: input.personal.countryOfResidence,
      destination_country: input.destination.preferredCountry,
      visa_type: visaType,
      eligibility_status: outcome.status,
      eligibility_score: outcome.score,
      priority: outcome.priority,
      source: "eligibility_form",
      assessment: { ...input, consent: { accepted: true, at: new Date().toISOString() } },
    })
    .select("id, code, assigned_counsellor_id")
    .single();

  if (error || !lead) {
    console.error("Failed to create lead", error);
    return SAVE_FAILED;
  }

  const country = COUNTRY_BY_SLUG.get(input.destination.preferredCountry)?.name ?? input.destination.preferredCountry;
  await Promise.all([
    notify({
      template: "eligibility_submitted",
      email: input.personal.email,
      userId: viewer?.id,
      payload: { name: input.personal.fullName, reference: lead.code, country },
    }),
    lead.assigned_counsellor_id &&
      notifyInApp(lead.assigned_counsellor_id, "lead_assigned", { leadId: lead.id, reference: lead.code, name: input.personal.fullName, country }),
  ]);

  return { status: "success", data: { reference: lead.code } };
}

export async function bookConsultation(_prev: FormState<LeadResult>, formData: FormData): Promise<FormState<LeadResult>> {
  if (isBot(formData)) return { status: "success", data: { reference: demoReference("CN") } };
  if (!(await rateLimit("consultation", 5, 10 * 60_000)).ok) return TOO_MANY;

  const parsed = consultationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please review the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;

  if (!isSupabaseAdminConfigured()) {
    console.info("[consultation] Supabase not configured — booking not persisted", { email: input.email });
    return { status: "success", data: { reference: demoReference("CN"), demo: true } };
  }

  const viewer = await getViewer();
  const supabase = createAdminClient();
  const email = input.email.toLowerCase();

  // Attach to the most recent open lead for this email, or create one.
  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, assigned_counsellor_id, status")
    .eq("email", email)
    .not("status", "in", "(approved,rejected,closed)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lead = existingLead;
  if (!lead) {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        user_id: viewer?.id ?? null,
        full_name: input.fullName,
        email,
        mobile: input.mobile,
        destination_country: input.country,
        visa_type: input.visaType,
        source: "consultation",
      })
      .select("id, assigned_counsellor_id, status")
      .single();
    if (error || !data) {
      console.error("Failed to create lead for consultation", error);
      return SAVE_FAILED;
    }
    lead = data;
  }

  // Preferred time is interpreted in the business timezone (IST) until per-user timezones are added.
  const preferredAt = new Date(`${input.preferredDate}T${input.preferredTime}:00+05:30`).toISOString();
  const { data: consultation, error } = await supabase
    .from("consultations")
    .insert({
      lead_id: lead.id,
      user_id: viewer?.id ?? null,
      counsellor_id: lead.assigned_counsellor_id,
      full_name: input.fullName,
      email,
      mobile: input.mobile,
      destination_country: input.country,
      visa_type: input.visaType,
      preferred_at: preferredAt,
      consultation_type: input.consultationType,
      notes: input.notes,
    })
    .select("id, code")
    .single();

  if (error || !consultation) {
    console.error("Failed to create consultation", error);
    return SAVE_FAILED;
  }

  if (["new", "contacted", "qualified"].includes(lead.status)) {
    await supabase.from("leads").update({ status: "consultation_scheduled" }).eq("id", lead.id);
  }

  const payload = { reference: consultation.code, name: input.fullName, when: preferredAt, type: input.consultationType };
  await Promise.all([
    notify({ template: "consultation_requested", email, mobile: input.mobile, userId: viewer?.id, payload }),
    lead.assigned_counsellor_id && notifyInApp(lead.assigned_counsellor_id, "consultation_counsellor_alert", { ...payload, consultationId: consultation.id }),
  ]);

  return { status: "success", data: { reference: consultation.code } };
}

export async function submitEnquiry(_prev: FormState<LeadResult>, formData: FormData): Promise<FormState<LeadResult>> {
  if (isBot(formData)) return { status: "success", data: { reference: demoReference("LD") } };
  if (!(await rateLimit("enquiry", 5, 10 * 60_000)).ok) return TOO_MANY;

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please review the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const input = parsed.data;
  if (!isSupabaseAdminConfigured()) {
    console.info("[enquiry] Supabase not configured — enquiry not persisted", { email: input.email });
    return { status: "success", data: { reference: demoReference("LD"), demo: true } };
  }

  const viewer = await getViewer();
  const { data: lead, error } = await createAdminClient()
    .from("leads")
    .insert({
      user_id: viewer?.id ?? null,
      full_name: input.fullName,
      email: input.email.toLowerCase(),
      mobile: input.mobile,
      destination_country: input.country,
      source: "enquiry",
      assessment: { message: input.message },
    })
    .select("code")
    .single();
  if (error || !lead) {
    console.error("Failed to create enquiry lead", error);
    return SAVE_FAILED;
  }
  await notify({ template: "enquiry_received", email: input.email, userId: viewer?.id, payload: { reference: lead.code, name: input.fullName } });
  return { status: "success", data: { reference: lead.code } };
}
