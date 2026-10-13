import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "@/lib/env";
import { mediaUrl } from "./media";
import { VISA_CATEGORIES, type VisaCategory } from "./categories";
import { COUNTRIES, type Country, type Faq, type Seo } from "./countries";
import { VISA_SERVICES, type VisaService } from "./visa-services";

/**
 * Published site content (countries, visa services, categories) edited in
 * Admin → Content. Read once per revalidation with the anon key, so RLS only
 * returns published rows; CMS mutations expire the `cms` tag.
 *
 * Falls back to the bundled placeholder files when Supabase isn't configured
 * or can't be reached, so the marketing site never renders empty.
 */

export const CMS_TAG = "cms";

type Snapshot = { countries: Country[]; services: VisaService[]; categories: VisaCategory[]; source: "database" | "files" };

const FILES: Snapshot = { countries: COUNTRIES, services: VISA_SERVICES, categories: VISA_CATEGORIES, source: "files" };

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const faqs = (v: unknown): Faq[] => (Array.isArray(v) ? v.filter((f) => f && typeof f.question === "string" && typeof f.answer === "string") : []);
const seo = (v: unknown): Seo => {
  const o = (v ?? {}) as Json;
  return { title: str(o.title) || undefined, description: str(o.description) || undefined };
};

export type CountryRow = { slug: string; name: string; region: string | null; iso_code: string | null; summary: string | null; content: Json; seo: Json; image_path?: string | null };
export type ServiceRow = { slug: string; title: string; summary: string | null; content: Json; seo: Json; image_path?: string | null; country: { slug: string } | null; category: { slug: string } | null };
export type CategoryRow = { slug: string; name: string; short_name: string | null; summary: string | null };

export function toCountry(r: CountryRow): Country {
  const c = (r.content ?? {}) as Json;
  return {
    slug: r.slug,
    name: r.name,
    isoCode: r.iso_code ?? "",
    region: r.region ?? "",
    tagline: r.summary ?? "",
    why: strs(c.why),
    immigrationOptions: Array.isArray(c.immigrationOptions) ? (c.immigrationOptions as Country["immigrationOptions"]).filter((o) => o && typeof o.title === "string") : [],
    work: str(c.work),
    study: str(c.study),
    permanentResidency: str(c.permanentResidency),
    family: str(c.family),
    visitor: str(c.visitor),
    eligibility: strs(c.eligibility),
    documents: strs(c.documents),
    processing: str(c.processing),
    faqs: faqs(c.faqs),
    seo: seo(r.seo),
    ...(r.image_path && { image: mediaUrl(r.image_path) }),
  };
}

export function toService(r: ServiceRow & { country: { slug: string }; category: { slug: string } }): VisaService {
  const c = (r.content ?? {}) as Json;
  const req = (c.requirements ?? {}) as Json;
  return {
    slug: r.slug,
    countrySlug: r.country.slug,
    categorySlug: r.category.slug,
    title: r.title,
    overview: r.summary ?? "",
    eligibility: strs(c.eligibility),
    whoCanApply: strs(c.whoCanApply),
    requirements: { age: str(req.age), education: str(req.education), workExperience: str(req.workExperience), language: str(req.language), financial: str(req.financial) },
    documents: strs(c.documents),
    process: Array.isArray(c.process) ? (c.process as VisaService["process"]).filter((s) => s && typeof s.title === "string") : [],
    processing: str(c.processing),
    notes: strs(c.notes),
    faqs: faqs(c.faqs),
    seo: seo(r.seo),
    ...(r.image_path && { image: mediaUrl(r.image_path) }),
  };
}

export function toCategory(r: CategoryRow): VisaCategory {
  return { slug: r.slug, name: r.name, short: r.short_name || r.name, description: r.summary ?? "" };
}

export const COUNTRY_COLUMNS = "slug, name, region, iso_code, summary, content, seo, image_path";
export const SERVICE_COLUMNS = "slug, title, summary, content, seo, image_path, country:countries(slug), category:visa_categories(slug)";
export const CATEGORY_COLUMNS = "slug, name, short_name, summary";

const loadSnapshot = unstable_cache(
  async (): Promise<Snapshot> => {
    // Cookie-free anon client: content is the same for every visitor, and RLS
    // limits it to published rows.
    const db = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const [countries, services, categories] = await Promise.all([
      db.from("countries").select(COUNTRY_COLUMNS).order("sort_order").order("name"),
      db.from("visa_services").select(SERVICE_COLUMNS).order("sort_order").order("title"),
      db.from("visa_categories").select(CATEGORY_COLUMNS).order("sort_order").order("name"),
    ]);
    const error = countries.error ?? services.error ?? categories.error;
    if (error) throw new Error(`CMS content query failed: ${error.message}`);
    return {
      countries: (countries.data as CountryRow[]).map(toCountry),
      // A service whose country or category is unpublished comes back without that join; hide it too.
      services: (services.data as unknown as ServiceRow[])
        .filter((s): s is ServiceRow & { country: { slug: string }; category: { slug: string } } => !!s.country && !!s.category)
        .map(toService),
      categories: (categories.data as CategoryRow[]).map(toCategory),
      source: "database",
    };
  },
  ["cms-snapshot"],
  { tags: [CMS_TAG], revalidate: 3600 },
);

export type SiteContent = Snapshot & {
  countryBySlug: Map<string, Country>;
  serviceBySlug: Map<string, VisaService>;
  categoryBySlug: Map<string, VisaCategory>;
  servicesForCountry: (countrySlug: string) => VisaService[];
  servicesForCategories: (categorySlugs: readonly string[]) => VisaService[];
  countryOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
};

/** Site content with lookup helpers. Cached across requests and deduped within one. */
export const getContent = cache(async (): Promise<SiteContent> => {
  let snapshot = FILES;
  if (isSupabaseConfigured()) {
    try {
      snapshot = await loadSnapshot();
    } catch (error) {
      console.error("Falling back to bundled content", error);
    }
  }
  const { countries, services, categories } = snapshot;
  return {
    ...snapshot,
    countryBySlug: new Map(countries.map((c) => [c.slug, c])),
    serviceBySlug: new Map(services.map((s) => [s.slug, s])),
    categoryBySlug: new Map(categories.map((c) => [c.slug, c])),
    servicesForCountry: (slug) => services.filter((s) => s.countrySlug === slug),
    servicesForCategories: (slugs) => services.filter((s) => slugs.includes(s.categorySlug)),
    countryOptions: countries.map((c) => ({ value: c.slug, label: c.name })),
    categoryOptions: categories.map((c) => ({ value: c.slug, label: c.name })),
  };
});
