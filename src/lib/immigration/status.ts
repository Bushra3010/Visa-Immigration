import type { BadgeTone } from "@/components/ui/primitives";

export const LEAD_STATUSES = [
  "new", "contacted", "qualified", "documents_pending", "consultation_scheduled",
  "application_in_progress", "submitted", "under_review", "approved", "rejected", "closed",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Customer-facing application timeline (PRD §6.9). */
export const APPLICATION_TIMELINE = [
  "enquiry_submitted", "eligibility_checked", "counsellor_assigned", "documents_submitted",
  "application_prepared", "application_submitted", "under_processing",
] as const;
export const APPLICATION_STATUSES = [...APPLICATION_TIMELINE, "approved", "rejected", "withdrawn"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const DOCUMENT_STATUSES = ["requested", "uploaded", "under_review", "approved", "rejected", "reupload_required"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "photograph", label: "Photograph" },
  { value: "education_certificate", label: "Education certificates" },
  { value: "mark_sheet", label: "Mark sheets" },
  { value: "experience_letter", label: "Experience letters" },
  { value: "bank_statement", label: "Bank statements" },
  { value: "language_test", label: "IELTS / PTE results" },
  { value: "employment_document", label: "Employment documents" },
  { value: "birth_certificate", label: "Birth certificate" },
  { value: "marriage_certificate", label: "Marriage certificate" },
  { value: "other", label: "Other supporting document" },
] as const;
export const DOCUMENT_TYPE_LABEL = new Map<string, string>(DOCUMENT_TYPES.map((d) => [d.value, d.label]));

const TONES: Record<string, BadgeTone> = {
  new: "brand", contacted: "neutral", qualified: "brand", documents_pending: "warning", consultation_scheduled: "brand",
  application_in_progress: "brand", submitted: "brand", under_review: "warning", approved: "success", rejected: "danger", closed: "neutral",
  enquiry_submitted: "neutral", eligibility_checked: "neutral", counsellor_assigned: "brand", documents_submitted: "brand",
  application_prepared: "brand", application_submitted: "brand", under_processing: "warning", withdrawn: "neutral",
  requested: "warning", uploaded: "brand", reupload_required: "danger",
  pending_payment: "warning", payment_received: "brand", booking_requested: "brand", confirmed: "success", failed: "danger",
  cancellation_requested: "warning", cancelled: "neutral",
  created: "neutral", pending: "warning", succeeded: "success", refunded: "neutral", partially_refunded: "neutral",
  likely_eligible: "success", needs_review: "warning", not_eligible: "danger", not_assessed: "neutral",
  low: "neutral", medium: "brand", high: "warning", urgent: "danger",
};

export const statusTone = (status: string): BadgeTone => TONES[status] ?? "neutral";
