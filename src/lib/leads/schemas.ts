import { z } from "zod";

const phone = z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid mobile number");
const optionalText = (max = 120) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || undefined);
const optionalNumber = (min: number, max: number) =>
  z.union([z.literal(""), z.coerce.number().min(min).max(max)]).optional().transform((v) => (v === "" ? undefined : v));

/** 7-step eligibility assessment (PRD §6.4). Each step validates independently. */
export const eligibilitySteps = {
  personal: z.object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.email("Enter a valid email").max(200),
    mobile: phone,
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth").refine((d) => {
      const age = (Date.now() - new Date(d).getTime()) / (365.25 * 86_400_000);
      return age >= 14 && age <= 100;
    }, "Enter a valid date of birth"),
    countryOfResidence: z.string().trim().min(2, "Enter your country of residence").max(80),
  }),
  destination: z.object({
    preferredCountry: z.string().trim().min(2, "Choose a destination"),
    preferredCity: optionalText(),
    objective: z.string().trim().min(2, "Choose your objective"),
  }),
  education: z.object({
    highestQualification: z.string().trim().min(2, "Choose your highest qualification"),
    institution: optionalText(),
    fieldOfStudy: optionalText(),
    graduationYear: optionalNumber(1950, new Date().getFullYear() + 6),
  }),
  work: z.object({
    currentOccupation: optionalText(),
    totalExperienceYears: optionalNumber(0, 60),
    industry: optionalText(),
    currentEmployer: optionalText(),
    jobPosition: optionalText(),
  }),
  language: z.object({
    testType: z.enum(["ielts", "pte", "toefl", "other", "none"]),
    overallScore: optionalNumber(0, 120),
    listening: optionalNumber(0, 120),
    reading: optionalNumber(0, 120),
    writing: optionalNumber(0, 120),
    speaking: optionalNumber(0, 120),
  }),
  financial: z.object({
    annualIncome: z.string().trim().min(1, "Choose an income range"),
    availableFunds: z.string().trim().min(1, "Choose a funds range"),
    sponsorship: optionalText(300),
  }),
  consent: z.object({
    consent: z.literal("on", { message: "Please accept to continue" }),
  }),
} as const;

export type EligibilityStepKey = keyof typeof eligibilitySteps;
export const ELIGIBILITY_STEP_ORDER: EligibilityStepKey[] = ["personal", "destination", "education", "work", "language", "financial", "consent"];

export const eligibilitySchema = z.object({
  personal: eligibilitySteps.personal,
  destination: eligibilitySteps.destination,
  education: eligibilitySteps.education,
  work: eligibilitySteps.work,
  language: eligibilitySteps.language,
  financial: eligibilitySteps.financial,
  consent: eligibilitySteps.consent,
});
export type EligibilityInput = z.infer<typeof eligibilitySchema>;

export const consultationSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email").max(200),
  mobile: phone,
  country: z.string().trim().min(2, "Choose a destination"),
  visaType: z.string().trim().min(2, "Choose a visa type"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  consultationType: z.enum(["phone", "video", "office"], { message: "Choose a consultation type" }),
  notes: optionalText(1000),
}).refine((v) => new Date(`${v.preferredDate}T${v.preferredTime}`) > new Date(), {
  path: ["preferredDate"],
  message: "Choose a future date and time",
});
export type ConsultationInput = z.infer<typeof consultationSchema>;

export const enquirySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email").max(200),
  mobile: phone,
  country: optionalText(),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000),
});
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const OBJECTIVE_TO_CATEGORY: Record<string, string> = {
  study: "student",
  work: "work",
  skilled: "skilled",
  visit: "visitor",
  business: "business",
  family: "family",
  pr: "permanent-residency",
  citizenship: "citizenship",
  "job-seeker": "job-seeker",
};
