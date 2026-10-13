import type { VisaCategory } from "./categories";
import type { Country, Seo } from "./countries";
import type { VisaService } from "./visa-services";

/** Typed content → `countries` / `visa_services` / `visa_categories` columns (inverse of the mappers in store.ts). */

const seoJson = (seo: Seo | undefined) => ({ ...(seo?.title && { title: seo.title }), ...(seo?.description && { description: seo.description }) });

export function countryColumns(c: Omit<Country, "slug">) {
  return {
    name: c.name,
    region: c.region || null,
    iso_code: c.isoCode || null,
    summary: c.tagline || null,
    content: {
      why: c.why,
      immigrationOptions: c.immigrationOptions,
      work: c.work,
      study: c.study,
      permanentResidency: c.permanentResidency,
      family: c.family,
      visitor: c.visitor,
      eligibility: c.eligibility,
      documents: c.documents,
      processing: c.processing,
      faqs: c.faqs,
    },
    seo: seoJson(c.seo),
  };
}

export function serviceColumns(s: Omit<VisaService, "slug" | "countrySlug" | "categorySlug">) {
  return {
    title: s.title,
    summary: s.overview || null,
    content: {
      eligibility: s.eligibility,
      whoCanApply: s.whoCanApply,
      requirements: s.requirements,
      documents: s.documents,
      process: s.process,
      processing: s.processing,
      notes: s.notes,
      faqs: s.faqs,
    },
    seo: seoJson(s.seo),
  };
}

export function categoryColumns(c: Omit<VisaCategory, "slug">) {
  return { name: c.name, short_name: c.short || null, summary: c.description || null };
}
