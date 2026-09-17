import type { EligibilityInput } from "./schemas";

export type EligibilityOutcome = {
  status: "likely_eligible" | "needs_review" | "not_eligible";
  score: number; // 0–100 indicative
  priority: "low" | "medium" | "high";
};

const QUALIFICATION_POINTS: Record<string, number> = {
  secondary: 5, diploma: 12, bachelors: 20, masters: 25, doctorate: 28,
};

const FUNDS_POINTS: Record<string, number> = {
  "under-5l": 2, "5l-15l": 8, "15l-30l": 14, "30l-plus": 18,
};

/**
 * Indicative triage score used to prioritise leads for counsellors.
 * It is NOT an eligibility decision — every lead is reviewed by a counsellor,
 * and visa decisions rest with the authorities (PRD §4.2).
 */
export function scoreEligibility(input: EligibilityInput): EligibilityOutcome {
  let score = 0;
  const age = (Date.now() - new Date(input.personal.dateOfBirth).getTime()) / (365.25 * 86_400_000);
  score += age >= 18 && age <= 35 ? 20 : age <= 45 ? 12 : 5;
  score += QUALIFICATION_POINTS[input.education.highestQualification] ?? 5;
  score += Math.min(input.work.totalExperienceYears ?? 0, 8) * 2;
  if (input.language.testType !== "none" && input.language.overallScore !== undefined) score += 14;
  score += FUNDS_POINTS[input.financial.availableFunds] ?? 0;

  score = Math.min(100, Math.round(score));
  const status = score >= 60 ? "likely_eligible" : score >= 30 ? "needs_review" : "not_eligible";
  const priority = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  // "not_eligible" is only a triage hint; the lead still goes to a counsellor.
  return { status, score, priority };
}
