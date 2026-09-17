import { VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.slug, label: c.name }));
export const VISA_TYPE_OPTIONS = VISA_CATEGORIES.map((c) => ({ value: c.slug, label: c.name }));

export const OBJECTIVE_OPTIONS = [
  { value: "study", label: "Study" },
  { value: "work", label: "Work" },
  { value: "skilled", label: "Skilled immigration" },
  { value: "pr", label: "Permanent residency" },
  { value: "visit", label: "Visit / tourism" },
  { value: "business", label: "Business / investment" },
  { value: "family", label: "Join family" },
  { value: "job-seeker", label: "Look for a job" },
  { value: "citizenship", label: "Citizenship" },
];

export const QUALIFICATION_OPTIONS = [
  { value: "secondary", label: "High school / secondary" },
  { value: "diploma", label: "Diploma / certificate" },
  { value: "bachelors", label: "Bachelor's degree" },
  { value: "masters", label: "Master's degree" },
  { value: "doctorate", label: "Doctorate (PhD)" },
];

export const INCOME_OPTIONS = [
  { value: "under-3l", label: "Under ₹3 lakh" },
  { value: "3l-10l", label: "₹3–10 lakh" },
  { value: "10l-25l", label: "₹10–25 lakh" },
  { value: "25l-plus", label: "Over ₹25 lakh" },
  { value: "prefer-not", label: "Prefer not to say" },
];

export const FUNDS_OPTIONS = [
  { value: "under-5l", label: "Under ₹5 lakh" },
  { value: "5l-15l", label: "₹5–15 lakh" },
  { value: "15l-30l", label: "₹15–30 lakh" },
  { value: "30l-plus", label: "Over ₹30 lakh" },
];

export const LANGUAGE_TEST_OPTIONS = [
  { value: "ielts", label: "IELTS" },
  { value: "pte", label: "PTE" },
  { value: "toefl", label: "TOEFL" },
  { value: "other", label: "Other" },
  { value: "none", label: "Not taken yet" },
];
