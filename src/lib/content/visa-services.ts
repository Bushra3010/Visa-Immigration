import type { Faq } from "./countries";

/**
 * Visa service pages (PRD §6.2). PLACEHOLDER COPY — see note in countries.ts.
 */
export type VisaService = {
  slug: string;
  countrySlug: string;
  categorySlug: string;
  title: string;
  overview: string;
  eligibility: string[];
  whoCanApply: string[];
  requirements: { age: string; education: string; workExperience: string; language: string; financial: string };
  documents: string[];
  process: { title: string; description: string }[];
  processing: string;
  notes: string[];
  faqs: Faq[];
};

const STANDARD_PROCESS = [
  { title: "Free eligibility assessment", description: "Share your profile online so a counsellor can review your options." },
  { title: "Consultation", description: "Discuss the best route, timelines and costs with your counsellor." },
  { title: "Document collection", description: "Upload documents securely from your dashboard; our documentation team verifies them." },
  { title: "Application preparation", description: "We prepare and review your application for completeness." },
  { title: "Submission & tracking", description: "Your application is submitted and you can track every status update online." },
  { title: "Decision & travel", description: "Once approved, plan your journey and book flights and hotels from your dashboard." },
];

const PROCESSING = "Processing time depends on the authority's current workload and your individual case. Your counsellor will share the latest official estimate.";

const NOTES = [
  "Requirements change frequently — always confirm against the official government source before applying.",
  "Submitting false or misleading information can lead to refusal and future bans.",
  "Visa decisions are made solely by the immigration authorities.",
];

const baseFaqs = (title: string): Faq[] => [
  { question: `How long does the ${title} take?`, answer: PROCESSING },
  { question: "Can I apply with my family?", answer: "Many routes allow dependants to be included or to apply separately. Your counsellor will confirm for your case." },
];

export const VISA_SERVICES: VisaService[] = [
  {
    slug: "canada-pr",
    countrySlug: "canada",
    categorySlug: "permanent-residency",
    title: "Canada PR Visa",
    overview: "Canadian permanent residence allows you to live, work and study anywhere in Canada. Skilled workers commonly apply through Express Entry-managed programs or Provincial Nominee Programs.",
    eligibility: ["Skilled work experience in an eligible occupation", "Language test results meeting the program minimum", "Education credential assessment for foreign degrees", "Sufficient settlement funds unless exempt"],
    whoCanApply: ["Skilled professionals", "International graduates with Canadian experience", "Tradespeople with qualifying experience"],
    requirements: {
      age: "No fixed upper age limit, but age affects your ranking score.",
      education: "Secondary education or higher; foreign credentials usually need an assessment.",
      workExperience: "Qualifying continuous skilled work experience as defined by the program.",
      language: "Approved English and/or French test meeting program minimums.",
      financial: "Proof of settlement funds unless you have a valid job offer or are already working in Canada.",
    },
    documents: ["Passport", "Language test results", "Educational Credential Assessment", "Reference letters", "Proof of funds", "Police certificates", "Medical exam (when requested)"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Canada PR process"),
  },
  {
    slug: "canada-study-permit",
    countrySlug: "canada",
    categorySlug: "student",
    title: "Canada Study Permit",
    overview: "A study permit lets international students study at a designated learning institution in Canada.",
    eligibility: ["Acceptance letter from a designated learning institution", "Proof of financial support", "Required provincial/territorial attestation where applicable", "Intention to comply with permit conditions"],
    whoCanApply: ["Students admitted to Canadian colleges and universities"],
    requirements: {
      age: "Minors may require a custodian.",
      education: "Academic history meeting the institution's admission criteria.",
      workExperience: "Not required.",
      language: "As required by the institution.",
      financial: "Proof you can pay tuition and living expenses.",
    },
    documents: ["Passport", "Letter of acceptance", "Proof of funds", "Academic transcripts", "Statement of purpose", "Language test results"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Canada study permit"),
  },
  {
    slug: "canada-visitor-visa",
    countrySlug: "canada",
    categorySlug: "visitor",
    title: "Canada Visitor Visa",
    overview: "A temporary resident visa for tourism, visiting family or short business trips to Canada.",
    eligibility: ["Valid travel document", "Good health", "Ties to your home country", "Sufficient funds for your stay"],
    whoCanApply: ["Tourists", "Family visitors", "Business visitors"],
    requirements: {
      age: "No age limit.",
      education: "Not required.",
      workExperience: "Not required; employment details support home ties.",
      language: "Not required.",
      financial: "Funds to cover the trip and stay.",
    },
    documents: ["Passport", "Photographs", "Bank statements", "Employment proof", "Invitation letter (if visiting family)", "Travel itinerary"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Canada visitor visa"),
  },
  {
    slug: "uk-student-visa",
    countrySlug: "uk",
    categorySlug: "student",
    title: "UK Student Visa",
    overview: "The Student route lets you study in the UK with a licensed student sponsor.",
    eligibility: ["Confirmation of Acceptance for Studies (CAS)", "Proof of funds for fees and living costs", "English language ability", "Tuberculosis test where applicable"],
    whoCanApply: ["Students offered a place on an eligible course"],
    requirements: {
      age: "16 or over for the Student route.",
      education: "Meets the sponsor's admission requirements.",
      workExperience: "Not required.",
      language: "English at the level required for your course.",
      financial: "Funds held for the required period.",
    },
    documents: ["Passport", "CAS", "Bank statements", "Academic certificates", "English test results", "TB test certificate (if required)"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("UK student visa"),
  },
  {
    slug: "uk-skilled-worker-visa",
    countrySlug: "uk",
    categorySlug: "work",
    title: "UK Skilled Worker Visa",
    overview: "Work in the UK for an approved employer in an eligible occupation.",
    eligibility: ["Job offer from a Home Office-licensed sponsor", "Certificate of Sponsorship", "Eligible occupation and salary", "English language requirement"],
    whoCanApply: ["Skilled professionals with a UK job offer"],
    requirements: {
      age: "18 or over.",
      education: "As required for the role.",
      workExperience: "As required by the employer.",
      language: "English at the required level.",
      financial: "Maintenance funds unless certified by the sponsor.",
    },
    documents: ["Passport", "Certificate of Sponsorship", "English test results", "Proof of funds", "Criminal record certificate (some roles)"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("UK Skilled Worker visa"),
  },
  {
    slug: "australia-skilled-migration",
    countrySlug: "australia",
    categorySlug: "skilled",
    title: "Australia Skilled Migration",
    overview: "Points-tested visas for skilled workers in occupations needed in Australia.",
    eligibility: ["Nominated occupation on the relevant list", "Suitable skills assessment", "Meet the points test pass mark", "Invitation to apply"],
    whoCanApply: ["Skilled workers", "Graduates with qualifying skills"],
    requirements: {
      age: "Age limits apply at the time of invitation.",
      education: "Qualifications relevant to the nominated occupation.",
      workExperience: "Experience counted as per points test.",
      language: "Competent English or higher.",
      financial: "Visa charges and settlement costs.",
    },
    documents: ["Passport", "Skills assessment", "English test results", "Employment references", "Police certificates", "Health examinations"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Australia skilled migration"),
  },
  {
    slug: "usa-visitor-visa",
    countrySlug: "usa",
    categorySlug: "visitor",
    title: "USA Visitor Visa (B1/B2)",
    overview: "Non-immigrant visa for business (B1) and tourism or medical treatment (B2).",
    eligibility: ["Temporary purpose of travel", "Strong ties to home country", "Funds to cover the trip", "Completed DS-160 and interview"],
    whoCanApply: ["Tourists", "Business visitors", "Visitors for medical treatment"],
    requirements: {
      age: "No age limit; interview waivers may apply to some age groups.",
      education: "Not required.",
      workExperience: "Not required; employment supports ties.",
      language: "Not required.",
      financial: "Funds for travel and stay.",
    },
    documents: ["Passport", "DS-160 confirmation", "Appointment confirmation", "Photograph", "Financial documents", "Employment proof"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("US visitor visa"),
  },
  {
    slug: "germany-job-seeker-visa",
    countrySlug: "germany",
    categorySlug: "job-seeker",
    title: "Germany Job Seeker (Opportunity Card)",
    overview: "Enter Germany to look for qualified employment.",
    eligibility: ["Recognised qualification or points-based criteria", "Proof of funds for the stay", "Health insurance", "Language skills as required"],
    whoCanApply: ["Qualified professionals seeking work in Germany"],
    requirements: {
      age: "Age can contribute to points.",
      education: "Recognised university degree or vocational training.",
      workExperience: "Relevant experience can contribute to points.",
      language: "German and/or English skills per route requirements.",
      financial: "Proof of funds, typically via blocked account.",
    },
    documents: ["Passport", "Degree and recognition documents", "CV", "Proof of funds", "Health insurance", "Language certificates"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Germany job seeker visa"),
  },
  {
    slug: "new-zealand-skilled-migrant",
    countrySlug: "new-zealand",
    categorySlug: "skilled",
    title: "New Zealand Skilled Migrant Category",
    overview: "Residence pathway for skilled workers with qualifying employment in New Zealand.",
    eligibility: ["Skilled employment or job offer", "Meet points threshold", "Age requirement", "English language"],
    whoCanApply: ["Skilled workers in New Zealand or with a job offer"],
    requirements: {
      age: "Upper age limit applies.",
      education: "Qualifications may contribute points.",
      workExperience: "Skilled employment requirements apply.",
      language: "Minimum English standard.",
      financial: "Visa fees and settlement costs.",
    },
    documents: ["Passport", "Employment agreement", "Qualifications", "English test results", "Police certificates", "Medical certificates"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("New Zealand skilled migrant"),
  },
  {
    slug: "uae-employment-visa",
    countrySlug: "uae",
    categorySlug: "work",
    title: "UAE Employment Visa",
    overview: "Residence visa sponsored by a UAE employer.",
    eligibility: ["Job offer from a UAE employer", "Work permit approval", "Medical fitness", "Emirates ID registration"],
    whoCanApply: ["Professionals with a UAE job offer"],
    requirements: {
      age: "18 or over.",
      education: "Attested certificates for skilled roles.",
      workExperience: "As required by employer.",
      language: "Not formally required.",
      financial: "Employer typically sponsors.",
    },
    documents: ["Passport", "Photographs", "Attested degree certificates", "Offer letter", "Medical test results"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("UAE employment visa"),
  },
  {
    slug: "schengen-visit-visa",
    countrySlug: "europe",
    categorySlug: "visitor",
    title: "Schengen Visit Visa",
    overview: "Short-stay visa for tourism, family visits and business across the Schengen Area.",
    eligibility: ["Travel itinerary and purpose", "Travel medical insurance", "Proof of accommodation", "Sufficient funds and home ties"],
    whoCanApply: ["Tourists", "Business visitors", "Family visitors"],
    requirements: {
      age: "No age limit.",
      education: "Not required.",
      workExperience: "Not required; employment supports ties.",
      language: "Not required.",
      financial: "Funds for the duration of stay.",
    },
    documents: ["Passport", "Application form", "Photographs", "Travel insurance", "Flight reservation", "Hotel booking", "Bank statements"],
    process: STANDARD_PROCESS,
    processing: PROCESSING,
    notes: NOTES,
    faqs: baseFaqs("Schengen visa"),
  },
];

export const SERVICE_BY_SLUG = new Map(VISA_SERVICES.map((s) => [s.slug, s]));

export const servicesForCountry = (countrySlug: string) => VISA_SERVICES.filter((s) => s.countrySlug === countrySlug);
export const servicesForCategories = (categories: readonly string[]) =>
  VISA_SERVICES.filter((s) => categories.includes(s.categorySlug));
