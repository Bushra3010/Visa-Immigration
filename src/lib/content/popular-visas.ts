/**
 * "Popular Visa Destinations" cards on /immigration.
 *
 * PLACEHOLDER FEES taken from the approved design. Service pricing must be
 * supplied by the business (PRD §15) before launch — replace or remove.
 * Photos: add public/Images/countries/<slug>.jpg to replace the flag artwork.
 */
export type PopularVisa = { countrySlug: string; label: string; visaType: string; fromPrice: number };

export const POPULAR_VISAS: PopularVisa[] = [
  { countrySlug: "usa", label: "USA", visaType: "Visitor Visa", fromPrice: 13999 },
  { countrySlug: "canada", label: "Canada", visaType: "Visitor Visa", fromPrice: 9999 },
  { countrySlug: "uk", label: "United Kingdom", visaType: "Standard Visitor Visa", fromPrice: 11999 },
  { countrySlug: "europe", label: "Schengen", visaType: "Short Stay Visa", fromPrice: 11999 },
  { countrySlug: "australia", label: "Australia", visaType: "Visitor Visa", fromPrice: 8999 },
  { countrySlug: "uae", label: "UAE", visaType: "Visit Visa", fromPrice: 13499 },
  { countrySlug: "germany", label: "Germany", visaType: "Job Seeker Visa", fromPrice: 11999 },
  { countrySlug: "new-zealand", label: "New Zealand", visaType: "Visitor Visa", fromPrice: 9999 },
];
