/**
 * Country landing-page content (PRD §6.1).
 *
 * PLACEHOLDER COPY: final country list and immigration content must be
 * supplied/approved by the business (PRD §15) and will move into the CMS
 * tables (`countries`). Wording is intentionally general — no fees, quotas
 * or processing times are asserted here because they change frequently.
 */

export type Faq = { question: string; answer: string };

export type Country = {
  slug: string;
  name: string;
  isoCode: string;
  region: string;
  tagline: string;
  why: string[];
  immigrationOptions: { title: string; description: string; visaSlug?: string }[];
  work: string;
  study: string;
  permanentResidency: string;
  family: string;
  visitor: string;
  eligibility: string[];
  documents: string[];
  processing: string;
  faqs: Faq[];
};

const COMMON_DOCUMENTS = [
  "Valid passport",
  "Recent passport-size photographs",
  "Education certificates and mark sheets",
  "Work experience letters",
  "Language test results (IELTS / PTE / TOEFL where required)",
  "Proof of funds / bank statements",
];

const COMMON_PROCESSING =
  "Processing times are set by the destination government and vary by visa type, application volume and the completeness of your file. Your counsellor will share the latest published estimate during consultation.";

const commonFaqs = (name: string): Faq[] => [
  {
    question: `Can you guarantee a ${name} visa?`,
    answer: "No consultant can guarantee a visa. Decisions are made solely by the immigration authorities. We help you choose the right route and prepare a complete, accurate application.",
  },
  {
    question: "How do I know if I am eligible?",
    answer: "Take our free online eligibility assessment. A counsellor reviews your profile and contacts you with suitable options.",
  },
  {
    question: "Can I book my flights and hotel through you after approval?",
    answer: "Yes. Once your visa is approved you can book flights and hotels directly from your dashboard.",
  },
];

export const COUNTRIES: Country[] = [
  {
    slug: "canada",
    name: "Canada",
    isoCode: "CA",
    region: "North America",
    tagline: "Study, work and settle in one of the world's most welcoming immigration destinations.",
    why: ["Well-established economic immigration programs", "Pathways from study and work to permanent residence", "High quality of life and public services", "Diverse, multicultural communities"],
    immigrationOptions: [
      { title: "Permanent Residency (Express Entry)", description: "Points-based selection for skilled workers.", visaSlug: "canada-pr" },
      { title: "Study Permit", description: "Study at a designated learning institution.", visaSlug: "canada-study-permit" },
      { title: "Work Permit", description: "Employer-specific and open work permits." },
      { title: "Visitor Visa", description: "Tourism and family visits.", visaSlug: "canada-visitor-visa" },
    ],
    work: "Work permits are available through employer job offers, international mobility programs and post-graduation routes.",
    study: "International students can study at designated institutions, with possible work rights during and after studies.",
    permanentResidency: "Skilled workers may qualify for permanent residence through federal and provincial nomination programs.",
    family: "Citizens and permanent residents may sponsor eligible spouses, partners, children and, in some cases, parents.",
    visitor: "Visitors can travel for tourism, to see family or for short business activities.",
    eligibility: ["Age, education and work experience are typically assessed", "Language ability in English and/or French", "Proof of settlement funds where required", "Medical and background checks"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("Canada"),
  },
  {
    slug: "australia",
    name: "Australia",
    isoCode: "AU",
    region: "Oceania",
    tagline: "Skilled migration, world-class universities and a strong economy.",
    why: ["Points-tested skilled migration programs", "Globally ranked universities", "Strong demand in many occupations", "Regional pathways and incentives"],
    immigrationOptions: [
      { title: "Skilled Migration", description: "Points-tested independent and nominated visas.", visaSlug: "australia-skilled-migration" },
      { title: "Student Visa", description: "Study at a registered Australian provider." },
      { title: "Visitor Visa", description: "Tourism and business visits." },
    ],
    work: "Employer-sponsored and skilled visas are available for occupations on the relevant skills lists.",
    study: "Students enrolled with registered providers can study and may be permitted limited work.",
    permanentResidency: "Several skilled and employer-sponsored streams lead to permanent residence.",
    family: "Partner, child and parent visas are available for eligible family members.",
    visitor: "Visitor visas allow tourism, family visits and business visitor activities.",
    eligibility: ["Occupation on an eligible skills list", "Positive skills assessment", "Age and English language requirements", "Health and character requirements"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("Australia"),
  },
  {
    slug: "uk",
    name: "United Kingdom",
    isoCode: "GB",
    region: "Europe",
    tagline: "Historic universities and a points-based immigration system.",
    why: ["World-renowned universities", "Skilled Worker route with licensed sponsors", "Graduate route after eligible study", "Global financial and business hub"],
    immigrationOptions: [
      { title: "Student Visa", description: "Study at a licensed student sponsor.", visaSlug: "uk-student-visa" },
      { title: "Skilled Worker Visa", description: "Work for a UK employer with a sponsor licence.", visaSlug: "uk-skilled-worker-visa" },
      { title: "Visitor Visa", description: "Tourism, business and family visits." },
    ],
    work: "The Skilled Worker route requires a job offer from a licensed sponsor meeting skill and salary thresholds.",
    study: "Students need an offer from a licensed sponsor and must meet financial and English requirements.",
    permanentResidency: "Indefinite Leave to Remain may be available after a qualifying period on eligible routes.",
    family: "Family visas are available for partners, children and certain other relatives.",
    visitor: "Standard Visitor visas cover tourism, visiting family and permitted business activities.",
    eligibility: ["Confirmation of sponsorship or acceptance for studies", "English language requirement", "Financial requirement", "Tuberculosis test for some nationalities"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("UK"),
  },
  {
    slug: "usa",
    name: "United States",
    isoCode: "US",
    region: "North America",
    tagline: "Opportunity in education, technology and business.",
    why: ["Leading universities and research institutions", "Large and diverse job market", "Investor and business routes", "Established family-based immigration"],
    immigrationOptions: [
      { title: "Visitor Visa (B1/B2)", description: "Business and tourism travel.", visaSlug: "usa-visitor-visa" },
      { title: "Student Visa (F-1)", description: "Academic study at certified schools." },
      { title: "Work Visas", description: "Employer-petitioned temporary work visas." },
    ],
    work: "Most US work visas require a petition from a US employer.",
    study: "Students need admission to a certified school and must show ability to fund their studies.",
    permanentResidency: "Green cards may be obtained through family, employment, investment and other categories.",
    family: "Citizens and permanent residents may petition for eligible relatives.",
    visitor: "B1/B2 visitor visas cover business meetings, tourism and visiting family.",
    eligibility: ["Purpose of travel consistent with the visa category", "Ties to home country for non-immigrant visas", "Financial ability", "Interview at a US embassy or consulate"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("US"),
  },
  {
    slug: "germany",
    name: "Germany",
    isoCode: "DE",
    region: "Europe",
    tagline: "Europe's largest economy with strong demand for skilled professionals.",
    why: ["Skilled immigration routes for qualified professionals", "Low or no tuition at many public universities", "Job seeker opportunities", "Central location in Europe"],
    immigrationOptions: [
      { title: "Opportunity Card / Job Seeker", description: "Enter Germany to look for skilled work.", visaSlug: "germany-job-seeker-visa" },
      { title: "EU Blue Card", description: "For highly qualified professionals with a job offer." },
      { title: "Student Visa", description: "Study at a German university." },
    ],
    work: "Qualified professionals with recognised qualifications and a job offer may obtain a residence permit for work.",
    study: "Students admitted to a German institution may need a blocked account as proof of funds.",
    permanentResidency: "A settlement permit may be available after qualifying employment and residence.",
    family: "Family reunification is available for spouses and minor children of eligible residents.",
    visitor: "Short-stay Schengen visas cover tourism and business visits.",
    eligibility: ["Recognised degree or vocational qualification", "German or English language skills depending on route", "Proof of funds", "Health insurance"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("Germany"),
  },
  {
    slug: "new-zealand",
    name: "New Zealand",
    isoCode: "NZ",
    region: "Oceania",
    tagline: "Work-life balance and skilled pathways in a stunning setting.",
    why: ["Skilled migrant pathways", "Accredited employer work visas", "Quality education", "Safe, welcoming communities"],
    immigrationOptions: [
      { title: "Skilled Migrant Category", description: "Residence for skilled workers.", visaSlug: "new-zealand-skilled-migrant" },
      { title: "Accredited Employer Work Visa", description: "Work for an accredited employer." },
      { title: "Visitor Visa", description: "Holidays and family visits." },
    ],
    work: "Most work visas require a job offer from an accredited employer.",
    study: "International students can study at approved education providers.",
    permanentResidency: "Residence visas are available through skilled and family categories.",
    family: "Partners and dependent children may be supported for visas.",
    visitor: "Visitor visas cover holidays, visiting family and some business activities.",
    eligibility: ["Skilled employment or job offer", "Qualifications and registration where required", "English language", "Health and character"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("New Zealand"),
  },
  {
    slug: "uae",
    name: "Dubai / UAE",
    isoCode: "AE",
    region: "Middle East",
    tagline: "A global business hub with employment, investor and long-term residence options.",
    why: ["Tax-efficient environment", "Employment and freelance visas", "Long-term Golden Visa options", "Global air connectivity"],
    immigrationOptions: [
      { title: "Employment Visa", description: "Sponsored by a UAE employer.", visaSlug: "uae-employment-visa" },
      { title: "Golden Visa", description: "Long-term residence for eligible investors and talent." },
      { title: "Tourist Visa", description: "Short visits for tourism." },
    ],
    work: "Employment visas are sponsored by a UAE employer; freelance permits exist in some free zones.",
    study: "Students enrolled with licensed institutions may be sponsored for residence.",
    permanentResidency: "Long-term residence is available via Golden Visa categories.",
    family: "Residents meeting income requirements may sponsor family members.",
    visitor: "Tourist visas are available for short stays; some nationalities receive visas on arrival.",
    eligibility: ["Job offer or qualifying investment", "Medical fitness test", "Emirates ID biometrics", "Attested educational documents for some roles"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("UAE"),
  },
  {
    slug: "europe",
    name: "Europe (Schengen)",
    isoCode: "EU",
    region: "Europe",
    tagline: "Visit, study and work across the Schengen Area.",
    why: ["Single short-stay visa for many countries", "Diverse study destinations", "National skilled work routes", "Rich culture and travel"],
    immigrationOptions: [
      { title: "Schengen Visit Visa", description: "Short stays across the Schengen Area.", visaSlug: "schengen-visit-visa" },
      { title: "National Work Visas", description: "Country-specific skilled work permits." },
      { title: "Study Visas", description: "Study in a Schengen member state." },
    ],
    work: "Work permits are issued nationally by each member state.",
    study: "Study visas are issued by the country of the institution.",
    permanentResidency: "Long-term residence rules differ by member state.",
    family: "Family reunification rules are set by each member state.",
    visitor: "A Schengen short-stay visa allows travel across member states within the permitted period.",
    eligibility: ["Purpose and itinerary of travel", "Travel medical insurance", "Proof of accommodation and funds", "Apply to the main destination country"],
    documents: COMMON_DOCUMENTS,
    processing: COMMON_PROCESSING,
    faqs: commonFaqs("Schengen"),
  },
];

export const COUNTRY_BY_SLUG = new Map(COUNTRIES.map((c) => [c.slug, c]));
