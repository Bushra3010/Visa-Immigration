"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, authorize, blank, DENIED, FAILED } from "@/lib/admin/guard";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { parseFaqs, parseList, parseOptions, parseSteps, SLUG_PATTERN } from "@/lib/content/cms-format";
import { COUNTRIES } from "@/lib/content/countries";
import { MAX_MEDIA_BYTES, MEDIA_BUCKET } from "@/lib/content/media";
import { categoryColumns, countryColumns, serviceColumns } from "@/lib/content/rows";
import { CMS_TAG } from "@/lib/content/store";
import { VISA_SERVICES } from "@/lib/content/visa-services";
import { checkUpload } from "@/lib/documents/validation";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

/**
 * Admin → Content (PRD §8.10). Writes go through the user's RLS-bound client
 * (CMS write policies allow super_admin / immigration_admin only). Every
 * change expires the cached site content so public pages update at once.
 *
 * Slugs are fixed after creation: leads, applications and counsellor
 * specialisations store them as plain text.
 */

type Ok = FormState;

const slug = z.string().trim().toLowerCase().max(80).regex(SLUG_PATTERN, "Lowercase letters, numbers and hyphens only");
const text = (max: number) => z.string().trim().max(max);
const sortOrder = z.coerce.number().int().min(0).max(10000);

function publishContent() {
  updateTag(CMS_TAG);
  // Full-route caches of statically rendered pages (nav, footer, sitemap, country/visa pages).
  revalidatePath("/", "layout");
}

function dbError(error: { code?: string; message: string }, what: string): Ok {
  if (error.code === "23505") return { status: "error", message: `That slug is already used by another ${what}.`, fieldErrors: { slug: "Already in use" } };
  console.error(`CMS ${what} save failed`, error);
  return FAILED;
}

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads the optional `image` upload / `removeImage` tick. Uploads a new file
 * before the row is saved; `path` is undefined when the image is unchanged.
 */
async function stageImage(supabase: Db, formData: FormData, folder: "countries" | "services", slug: string): Promise<{ path?: string | null; error?: Ok }> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_MEDIA_BYTES) return { error: { status: "error", message: "Images must be 5 MB or smaller.", fieldErrors: { image: "Too large" } } };
    const check = checkUpload(file.name, file.size, new Uint8Array(await file.slice(0, 16).arrayBuffer()));
    if (!check.ok || !check.mime.startsWith("image/")) {
      return { error: { status: "error", message: check.ok ? "Upload a JPG, PNG or WebP image." : check.reason, fieldErrors: { image: "Invalid image" } } };
    }
    const path = `${folder}/${slug}-${Date.now().toString(36)}.${check.ext}`;
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: check.mime, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("CMS image upload failed", error);
      return { error: { status: "error", message: "Could not upload the image. Please try again." } };
    }
    return { path };
  }
  return formData.get("removeImage") === "on" ? { path: null } : {};
}

async function removeImages(supabase: Db, ...paths: (string | null | undefined)[]) {
  const list = paths.filter((p): p is string => !!p);
  if (!list.length) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(list);
  if (error) console.error("CMS image cleanup failed", error);
}

const confirmed = (formData: FormData) => formData.get("confirm") === "on";
const NOT_CONFIRMED: Ok = { status: "error", message: "Tick the confirmation box to delete." };

// ---------------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------------

const countrySchema = z.object({
  id: z.uuid().optional(),
  slug: slug.optional(),
  name: text(80).min(2, "Required"),
  isoCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Two-letter ISO code, e.g. CA").optional(),
  region: text(60),
  tagline: text(300),
  sortOrder,
  isPublished: z.boolean(),
  why: text(5000),
  options: text(10000),
  work: text(3000),
  study: text(3000),
  permanentResidency: text(3000),
  family: text(3000),
  visitor: text(3000),
  eligibility: text(5000),
  documents: text(5000),
  processing: text(3000),
  faqs: text(20000),
  seoTitle: text(120),
  seoDescription: text(320),
});

export async function saveCountry(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const field = (k: string) => String(formData.get(k) ?? "");
  const parsed = countrySchema.safeParse({
    id: blank(formData.get("id")),
    slug: blank(formData.get("slug")),
    name: field("name"),
    isoCode: blank(formData.get("isoCode")),
    region: field("region"),
    tagline: field("tagline"),
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
    ...Object.fromEntries(["why", "options", "work", "study", "permanentResidency", "family", "visitor", "eligibility", "documents", "processing", "faqs", "seoTitle", "seoDescription"].map((k) => [k, field(k)])),
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  if (!d.id && !d.slug) return { status: "error", message: "Enter a URL slug.", fieldErrors: { slug: "Required" } };

  const row = {
    ...countryColumns({
      name: d.name, isoCode: d.isoCode ?? "", region: d.region, tagline: d.tagline,
      why: parseList(d.why), immigrationOptions: parseOptions(d.options),
      work: d.work, study: d.study, permanentResidency: d.permanentResidency, family: d.family, visitor: d.visitor,
      eligibility: parseList(d.eligibility), documents: parseList(d.documents), processing: d.processing, faqs: parseFaqs(d.faqs),
      seo: { title: d.seoTitle, description: d.seoDescription },
    }),
    sort_order: d.sortOrder,
    is_published: d.isPublished,
  };
  const supabase = await createClient();
  const { data: before } = d.id ? await supabase.from("countries").select("slug, image_path").eq("id", d.id).maybeSingle() : { data: null };
  if (d.id && !before) return DENIED;
  const image = await stageImage(supabase, formData, "countries", before?.slug ?? d.slug!);
  if (image.error) return image.error;
  const withImage = image.path === undefined ? row : { ...row, image_path: image.path };
  const { data, error } = d.id
    ? await supabase.from("countries").update(withImage).eq("id", d.id).select("id, slug").single()
    : await supabase.from("countries").insert({ ...withImage, slug: d.slug }).select("id, slug").single();
  if (error || !data) {
    await removeImages(supabase, image.path);
    return error ? dbError(error, "country") : FAILED;
  }
  if (image.path !== undefined) await removeImages(supabase, before?.image_path);

  await audit(viewer, d.id ? "cms.country.update" : "cms.country.create", "country", data.id, { slug: data.slug, is_published: d.isPublished });
  publishContent();
  if (!d.id) redirect(`/admin/cms/countries/${data.slug}?created=1`);
  return { status: "success", message: d.isPublished ? "Saved and live on the site." : "Saved as draft (not published)." };
}

export async function deleteCountry(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  if (!confirmed(formData)) return NOT_CONFIRMED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("countries").delete().eq("id", id.data).select("id, slug, image_path").maybeSingle();
  if (error?.code === "23503") return { status: "error", message: "This country still has visa service pages. Delete or move them first, or unpublish the country instead." };
  if (error || !data) return error ? dbError(error, "country") : DENIED;
  await removeImages(supabase, data.image_path);
  await audit(viewer, "cms.country.delete", "country", data.id, { slug: data.slug });
  publishContent();
  redirect("/admin/cms?deleted=country");
}

// ---------------------------------------------------------------------------
// Visa service pages
// ---------------------------------------------------------------------------

const serviceSchema = z.object({
  id: z.uuid().optional(),
  slug: slug.optional(),
  title: text(120).min(2, "Required"),
  countrySlug: slug,
  categorySlug: slug,
  overview: text(3000),
  sortOrder,
  serviceFee: z.coerce.number().min(0).max(100_000_000).optional(),
  isPublished: z.boolean(),
  eligibility: text(5000),
  whoCanApply: text(5000),
  reqAge: text(1000),
  reqEducation: text(1000),
  reqWork: text(1000),
  reqLanguage: text(1000),
  reqFinancial: text(1000),
  documents: text(5000),
  process: text(10000),
  processing: text(3000),
  notes: text(5000),
  faqs: text(20000),
  seoTitle: text(120),
  seoDescription: text(320),
});

export async function saveService(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const field = (k: string) => String(formData.get(k) ?? "");
  const parsed = serviceSchema.safeParse({
    id: blank(formData.get("id")),
    slug: blank(formData.get("slug")),
    title: field("title"),
    countrySlug: field("countrySlug"),
    categorySlug: field("categorySlug"),
    overview: field("overview"),
    sortOrder: formData.get("sortOrder") || 0,
    serviceFee: blank(formData.get("serviceFee")),
    isPublished: formData.get("isPublished") === "on",
    ...Object.fromEntries(
      ["eligibility", "whoCanApply", "reqAge", "reqEducation", "reqWork", "reqLanguage", "reqFinancial", "documents", "process", "processing", "notes", "faqs", "seoTitle", "seoDescription"].map((k) => [k, field(k)]),
    ),
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  if (!d.id && !d.slug) return { status: "error", message: "Enter a URL slug.", fieldErrors: { slug: "Required" } };

  const supabase = await createClient();
  const [{ data: country }, { data: category }] = await Promise.all([
    supabase.from("countries").select("id").eq("slug", d.countrySlug).maybeSingle(),
    supabase.from("visa_categories").select("id").eq("slug", d.categorySlug).maybeSingle(),
  ]);
  if (!country || !category) return { status: "error", message: "Choose an existing country and category." };

  const row = {
    ...serviceColumns({
      title: d.title, overview: d.overview,
      eligibility: parseList(d.eligibility), whoCanApply: parseList(d.whoCanApply),
      requirements: { age: d.reqAge, education: d.reqEducation, workExperience: d.reqWork, language: d.reqLanguage, financial: d.reqFinancial },
      documents: parseList(d.documents), process: parseSteps(d.process), processing: d.processing,
      notes: parseList(d.notes), faqs: parseFaqs(d.faqs),
      seo: { title: d.seoTitle, description: d.seoDescription },
    }),
    country_id: country.id,
    category_id: category.id,
    service_fee: d.serviceFee ?? null,
    sort_order: d.sortOrder,
    is_published: d.isPublished,
  };
  const { data: before } = d.id ? await supabase.from("visa_services").select("slug, image_path").eq("id", d.id).maybeSingle() : { data: null };
  if (d.id && !before) return DENIED;
  const image = await stageImage(supabase, formData, "services", before?.slug ?? d.slug!);
  if (image.error) return image.error;
  const withImage = image.path === undefined ? row : { ...row, image_path: image.path };
  const { data, error } = d.id
    ? await supabase.from("visa_services").update(withImage).eq("id", d.id).select("id, slug").single()
    : await supabase.from("visa_services").insert({ ...withImage, slug: d.slug }).select("id, slug").single();
  if (error || !data) {
    await removeImages(supabase, image.path);
    return error ? dbError(error, "visa service") : FAILED;
  }
  if (image.path !== undefined) await removeImages(supabase, before?.image_path);

  await audit(viewer, d.id ? "cms.service.update" : "cms.service.create", "visa_service", data.id, { slug: data.slug, is_published: d.isPublished });
  publishContent();
  if (!d.id) redirect(`/admin/cms/services/${data.slug}?created=1`);
  return { status: "success", message: d.isPublished ? "Saved and live on the site." : "Saved as draft (not published)." };
}

export async function deleteService(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  if (!confirmed(formData)) return NOT_CONFIRMED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("visa_services").delete().eq("id", id.data).select("id, slug, image_path").maybeSingle();
  if (error || !data) return error ? dbError(error, "visa service") : DENIED;
  await removeImages(supabase, data.image_path);
  await audit(viewer, "cms.service.delete", "visa_service", data.id, { slug: data.slug });
  publishContent();
  redirect("/admin/cms?deleted=service");
}

// ---------------------------------------------------------------------------
// Visa categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  id: z.uuid().optional(),
  slug: slug.optional(),
  name: text(80).min(2, "Required"),
  shortName: text(30),
  description: text(500),
  sortOrder,
  isPublished: z.boolean(),
});

export async function saveCategory(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const parsed = categorySchema.safeParse({
    id: blank(formData.get("id")),
    slug: blank(formData.get("slug")),
    name: String(formData.get("name") ?? ""),
    shortName: String(formData.get("shortName") ?? ""),
    description: String(formData.get("description") ?? ""),
    sortOrder: formData.get("sortOrder") || 0,
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  if (!d.id && !d.slug) return { status: "error", message: "Enter a URL slug.", fieldErrors: { slug: "Required" } };

  const row = { ...categoryColumns({ name: d.name, short: d.shortName, description: d.description }), sort_order: d.sortOrder, is_published: d.isPublished };
  const supabase = await createClient();
  const { data, error } = d.id
    ? await supabase.from("visa_categories").update(row).eq("id", d.id).select("id, slug").single()
    : await supabase.from("visa_categories").insert({ ...row, slug: d.slug }).select("id, slug").single();
  if (error || !data) return error ? dbError(error, "category") : FAILED;

  await audit(viewer, d.id ? "cms.category.update" : "cms.category.create", "visa_category", data.id, { slug: data.slug, is_published: d.isPublished });
  publishContent();
  revalidatePath("/admin/cms/categories");
  return { status: "success", message: d.id ? "Category saved." : "Category created." };
}

export async function deleteCategory(_prev: Ok, formData: FormData): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  if (!confirmed(formData)) return NOT_CONFIRMED;
  const supabase = await createClient();
  const { data, error } = await supabase.from("visa_categories").delete().eq("id", id.data).select("id, slug").maybeSingle();
  if (error?.code === "23503") return { status: "error", message: "Visa service pages still use this category. Move them first, or unpublish the category instead." };
  if (error || !data) return error ? dbError(error, "category") : DENIED;
  await audit(viewer, "cms.category.delete", "visa_category", data.id, { slug: data.slug });
  publishContent();
  revalidatePath("/admin/cms/categories");
  return { status: "success", message: "Category deleted." };
}

// ---------------------------------------------------------------------------
// One-off import of the bundled placeholder copy
// ---------------------------------------------------------------------------

/**
 * Copies src/lib/content into the CMS tables. Only fills gaps: rows that don't
 * exist yet are created and seeded rows with no copy are completed; anything
 * already edited in the CMS is left alone, so it's safe to run twice.
 */
export async function importBundledContent(_prev: Ok): Promise<Ok> {
  const viewer = await authorize("cms");
  if (!viewer) return DENIED;
  const supabase = await createClient();
  const counts = { countries: 0, categories: 0, services: 0 };

  const { data: existingCategories, error: catErr } = await supabase.from("visa_categories").select("id, slug, short_name, summary");
  if (catErr) return dbError(catErr, "category");
  const catBySlug = new Map(existingCategories.map((c) => [c.slug, c]));
  for (const [i, c] of VISA_CATEGORIES.entries()) {
    const found = catBySlug.get(c.slug);
    if (found && (found.short_name || found.summary)) continue;
    const row = categoryColumns(c);
    const { error } = found
      ? await supabase.from("visa_categories").update(row).eq("id", found.id)
      : await supabase.from("visa_categories").insert({ ...row, slug: c.slug, sort_order: i + 1, is_published: true });
    if (error) return dbError(error, "category");
    counts.categories++;
  }

  const { data: existingCountries, error: coErr } = await supabase.from("countries").select("id, slug, content");
  if (coErr) return dbError(coErr, "country");
  const coBySlug = new Map(existingCountries.map((c) => [c.slug, c]));
  for (const [i, c] of COUNTRIES.entries()) {
    const found = coBySlug.get(c.slug);
    if (found && Object.keys(found.content ?? {}).length > 0) continue;
    const row = countryColumns(c);
    const { error } = found
      ? await supabase.from("countries").update(row).eq("id", found.id)
      : await supabase.from("countries").insert({ ...row, slug: c.slug, sort_order: i + 1, is_published: true });
    if (error) return dbError(error, "country");
    counts.countries++;
  }

  const [{ data: countries }, { data: categories }, { data: services, error: svErr }] = await Promise.all([
    supabase.from("countries").select("id, slug"),
    supabase.from("visa_categories").select("id, slug"),
    supabase.from("visa_services").select("slug"),
  ]);
  if (svErr) return dbError(svErr, "visa service");
  const countryId = new Map((countries ?? []).map((c) => [c.slug, c.id]));
  const categoryId = new Map((categories ?? []).map((c) => [c.slug, c.id]));
  const haveService = new Set((services ?? []).map((s) => s.slug));
  const newServices = VISA_SERVICES.flatMap((s, i) => {
    const country_id = countryId.get(s.countrySlug);
    const category_id = categoryId.get(s.categorySlug);
    if (haveService.has(s.slug) || !country_id || !category_id) return [];
    return [{ ...serviceColumns(s), slug: s.slug, country_id, category_id, sort_order: i + 1, is_published: true }];
  });
  if (newServices.length) {
    const { error } = await supabase.from("visa_services").insert(newServices);
    if (error) return dbError(error, "visa service");
    counts.services = newServices.length;
  }

  await audit(viewer, "cms.import", "cms", viewer.id, counts);
  publishContent();
  revalidatePath("/admin/cms");
  const total = counts.countries + counts.categories + counts.services;
  return {
    status: "success",
    message: total ? `Imported ${counts.countries} countries, ${counts.services} visa pages and ${counts.categories} categories.` : "Nothing to import. Everything is already in the CMS.",
  };
}
