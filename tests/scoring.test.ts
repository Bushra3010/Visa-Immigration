import { describe, expect, it } from "vitest";
import { eligibilitySchema, eligibilitySteps } from "@/lib/leads/schemas";
import { scoreEligibility } from "@/lib/leads/scoring";

const dobForAge = (age: number) => `${new Date().getFullYear() - age}-01-01`;

const input = (overrides: Record<string, Record<string, unknown>> = {}) =>
  eligibilitySchema.parse({
    personal: { fullName: "Test User", email: "t@example.com", mobile: "+91 98765 43210", dateOfBirth: dobForAge(28), countryOfResidence: "India", ...overrides.personal },
    destination: { preferredCountry: "canada", objective: "pr", ...overrides.destination },
    education: { highestQualification: "masters", ...overrides.education },
    work: { totalExperienceYears: "6", ...overrides.work },
    language: { testType: "ielts", overallScore: "7.5", ...overrides.language },
    financial: { annualIncome: "10l-25l", availableFunds: "15l-30l", ...overrides.financial },
    consent: { consent: "on" },
  });

describe("eligibility", () => {
  it("scores a strong profile as likely eligible / high priority", () => {
    const r = scoreEligibility(input());
    expect(r.status).toBe("likely_eligible");
    expect(r.priority).toBe("high");
  });

  it("scores a weak profile lower", () => {
    const r = scoreEligibility(input({ personal: { dateOfBirth: dobForAge(55) }, education: { highestQualification: "secondary" }, work: { totalExperienceYears: "0" }, language: { testType: "none", overallScore: "" }, financial: { availableFunds: "under-5l" } }));
    expect(r.status).not.toBe("likely_eligible");
    expect(r.score).toBeLessThan(40);
  });

  it("requires consent on the final step", () => {
    expect(eligibilitySteps.consent.safeParse({}).success).toBe(false);
  });

  it("rejects invalid contact details", () => {
    const r = eligibilitySteps.personal.safeParse({ fullName: "A", email: "nope", mobile: "12", dateOfBirth: "", countryOfResidence: "" });
    expect(r.success).toBe(false);
  });
});
