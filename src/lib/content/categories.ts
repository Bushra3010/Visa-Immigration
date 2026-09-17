export type VisaCategory = { slug: string; name: string; short: string; description: string };

export const VISA_CATEGORIES: VisaCategory[] = [
  { slug: "student", name: "Student Visa", short: "Study", description: "Study at universities, colleges and schools abroad." },
  { slug: "work", name: "Work Visa", short: "Work", description: "Employer-sponsored and open work permits." },
  { slug: "skilled", name: "Skilled Immigration", short: "Skilled", description: "Points-based and skilled-worker migration programs." },
  { slug: "visitor", name: "Visitor Visa", short: "Visit", description: "Tourism, visiting family and short business trips." },
  { slug: "business", name: "Business Immigration", short: "Business", description: "Investor, entrepreneur and start-up routes." },
  { slug: "family", name: "Family Immigration", short: "Family", description: "Spouse, partner, parent and child sponsorship." },
  { slug: "permanent-residency", name: "Permanent Residency", short: "PR", description: "Settle permanently with long-term residence rights." },
  { slug: "citizenship", name: "Citizenship", short: "Citizenship", description: "Naturalisation after qualifying residence." },
  { slug: "dependent", name: "Dependent Visa", short: "Dependent", description: "Join a family member who holds a visa abroad." },
  { slug: "job-seeker", name: "Job Seeker Visa", short: "Job Seeker", description: "Enter a country to search for skilled employment." },
];

export const CATEGORY_BY_SLUG = new Map(VISA_CATEGORIES.map((c) => [c.slug, c]));

/** Top-nav service pages (PRD §5.1) map onto categories. */
export const SERVICE_NAV = [
  { href: "/work-abroad", label: "Work Abroad", categories: ["work", "skilled", "job-seeker"] },
  { href: "/study-abroad", label: "Study Abroad", categories: ["student"] },
  { href: "/visit-visa", label: "Visit Visa", categories: ["visitor"] },
  { href: "/business-immigration", label: "Business Immigration", categories: ["business"] },
  { href: "/family-immigration", label: "Family Immigration", categories: ["family", "dependent"] },
  { href: "/permanent-residency", label: "Permanent Residency", categories: ["permanent-residency"] },
  { href: "/citizenship", label: "Citizenship", categories: ["citizenship"] },
] as const;
