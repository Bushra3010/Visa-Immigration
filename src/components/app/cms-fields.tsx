import type { ReactNode } from "react";
import { ActionForm } from "@/components/app/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Card } from "@/components/ui/primitives";
import { formatFaqs, formatList, formatOptions, formatSteps } from "@/lib/content/cms-format";
import type { Country } from "@/lib/content/countries";
import type { VisaService } from "@/lib/content/visa-services";
import type { FormState } from "@/lib/forms";

/** Form sections for Admin → Content editors. Server-rendered; ActionForm adds pending/result state. */

export type Meta = { id?: string; sortOrder?: number; isPublished?: boolean };
type Option = { value: string; label: string };

const LIST_HINT = "One item per line.";

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0 sm:grid-cols-2">
      <legend className="sr-only">{title}</legend>
      <div className="sm:col-span-2">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

function Area({ name, label, value, rows = 4, hint, wide = true }: { name: string; label: string; value?: string; rows?: number; hint?: string; wide?: boolean }) {
  return (
    <Field label={label} htmlFor={name} hint={hint} className={wide ? "sm:col-span-2" : undefined}>
      <Textarea id={name} name={name} rows={rows} defaultValue={value} />
    </Field>
  );
}

/** Slug is editable only while creating; existing pages keep their URL (and the leads/applications that reference it). */
function SlugField({ prefix, slug }: { prefix: string; slug?: string }) {
  return slug ? (
    <Field label="URL" htmlFor="slug-readonly" hint="Fixed once created, because leads and applications refer to it.">
      <Input id="slug-readonly" value={`${prefix}${slug}`} readOnly disabled />
    </Field>
  ) : (
    <Field label="URL slug" htmlFor="slug" required hint={`Lowercase words joined by hyphens. Page URL: ${prefix}your-slug`}>
      <Input id="slug" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="e.g. new-zealand" />
    </Field>
  );
}

function PublishFields({ meta }: { meta: Meta }) {
  return (
    <>
      <Field label="Sort order" htmlFor="sortOrder" hint="Lower numbers appear first.">
        <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={meta.sortOrder ?? 0} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
        <input type="checkbox" name="isPublished" defaultChecked={meta.isPublished ?? false} className="accent-brand-600" />
        Published (visible on the website)
      </label>
    </>
  );
}

function ImageField({ image, label, hint }: { image?: string; label: string; hint: string }) {
  return (
    <div className="sm:col-span-2">
      <p className="mb-1 text-sm font-medium text-ink">{label}</p>
      <div className="flex flex-wrap items-start gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL, preview only
          <img src={image} alt="Current image" className="h-28 w-44 rounded-lg border border-line object-cover" />
        ) : (
          <div className="flex h-28 w-44 items-center justify-center rounded-lg border border-dashed border-line bg-canvas text-xs text-muted">No image</div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="text-xs text-muted">{hint} JPG, PNG or WebP, up to 5 MB. A new upload replaces the current image.</p>
          {image && (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="removeImage" className="accent-danger" /> Remove current image</label>
          )}
        </div>
      </div>
    </div>
  );
}

function SeoFields({ seo }: { seo?: { title?: string; description?: string } }) {
  return (
    <Group title="SEO" description="Leave blank to use the automatically generated title and description.">
      <Field label="Page title" htmlFor="seoTitle"><Input id="seoTitle" name="seoTitle" maxLength={120} defaultValue={seo?.title} /></Field>
      <Area name="seoDescription" label="Meta description" value={seo?.description} rows={2} wide={false} />
    </Group>
  );
}

export function CountryFields({ country, meta }: { country?: Country; meta: Meta }) {
  return (
    <div className="space-y-6">
      {meta.id && <input type="hidden" name="id" value={meta.id} />}
      <Group title="Basics">
        <Field label="Country name" htmlFor="name" required><Input id="name" name="name" required defaultValue={country?.name} /></Field>
        <SlugField prefix="/countries/" slug={country?.slug} />
        <Field label="ISO code" htmlFor="isoCode" hint="Two letters, used for the flag (CA, GB, AE…)."><Input id="isoCode" name="isoCode" maxLength={2} defaultValue={country?.isoCode} className="uppercase" /></Field>
        <Field label="Region" htmlFor="region"><Input id="region" name="region" defaultValue={country?.region} placeholder="e.g. North America" /></Field>
        <Area name="tagline" label="Tagline" value={country?.tagline} rows={2} />
        <ImageField image={country?.image} label="Photo" hint="Shown behind the page header and on destination cards. Landscape works best (about 1600×900)." />
        <PublishFields meta={meta} />
      </Group>
      <Group title="Overview">
        <Area name="why" label="Why this country" value={formatList(country?.why)} hint={LIST_HINT} />
        <Area name="options" label="Immigration options" value={formatOptions(country?.immigrationOptions)} rows={5}
          hint="One per line: Title | Short description | visa-page-slug (optional, links to /visa/…)." />
      </Group>
      <Group title="Pathways">
        <Area name="work" label="Work opportunities" value={country?.work} rows={3} wide={false} />
        <Area name="study" label="Study options" value={country?.study} rows={3} wide={false} />
        <Area name="permanentResidency" label="Permanent residency" value={country?.permanentResidency} rows={3} wide={false} />
        <Area name="family" label="Family sponsorship" value={country?.family} rows={3} wide={false} />
        <Area name="visitor" label="Visitor visa" value={country?.visitor} rows={3} wide={false} />
      </Group>
      <Group title="Requirements">
        <Area name="eligibility" label="Eligibility" value={formatList(country?.eligibility)} hint={LIST_HINT} wide={false} />
        <Area name="documents" label="Required documents" value={formatList(country?.documents)} hint={LIST_HINT} wide={false} />
        <Area name="processing" label="Processing information" value={country?.processing} rows={3} />
      </Group>
      <Group title="FAQs">
        <Area name="faqs" label="Questions" value={formatFaqs(country?.faqs)} rows={6} hint="One per line: Question | Answer" />
      </Group>
      <SeoFields seo={country?.seo} />
    </div>
  );
}

export function ServiceFields({ service, meta, serviceFee, countries, categories }: {
  service?: VisaService; meta: Meta; serviceFee?: number | null; countries: Option[]; categories: Option[];
}) {
  const r = service?.requirements;
  return (
    <div className="space-y-6">
      {meta.id && <input type="hidden" name="id" value={meta.id} />}
      <Group title="Basics">
        <Field label="Title" htmlFor="title" required><Input id="title" name="title" required defaultValue={service?.title} placeholder="e.g. Canada PR Visa" /></Field>
        <SlugField prefix="/visa/" slug={service?.slug} />
        <Field label="Country" htmlFor="countrySlug" required>
          <Select id="countrySlug" name="countrySlug" required defaultValue={service?.countrySlug ?? ""}>
            <option value="" disabled>Choose…</option>
            {countries.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Visa category" htmlFor="categorySlug" required>
          <Select id="categorySlug" name="categorySlug" required defaultValue={service?.categorySlug ?? ""}>
            <option value="" disabled>Choose…</option>
            {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <Field label="Service fee (₹, optional)" htmlFor="serviceFee" hint="Internal reference only; not shown on the page.">
          <Input id="serviceFee" name="serviceFee" type="number" min={0} step="0.01" defaultValue={serviceFee ?? ""} />
        </Field>
        <div />
        <Area name="overview" label="Overview" value={service?.overview} rows={3} />
        <ImageField image={service?.image} label="Header image" hint="Shown behind the page title. Landscape works best (about 1600×600)." />
        <PublishFields meta={meta} />
      </Group>
      <Group title="Who it's for">
        <Area name="eligibility" label="Eligibility" value={formatList(service?.eligibility)} hint={LIST_HINT} wide={false} />
        <Area name="whoCanApply" label="Who can apply" value={formatList(service?.whoCanApply)} hint={LIST_HINT} wide={false} />
      </Group>
      <Group title="Requirements">
        <Area name="reqAge" label="Age" value={r?.age} rows={2} wide={false} />
        <Area name="reqEducation" label="Education" value={r?.education} rows={2} wide={false} />
        <Area name="reqWork" label="Work experience" value={r?.workExperience} rows={2} wide={false} />
        <Area name="reqLanguage" label="Language" value={r?.language} rows={2} wide={false} />
        <Area name="reqFinancial" label="Financial" value={r?.financial} rows={2} />
      </Group>
      <Group title="Process">
        <Area name="documents" label="Required documents" value={formatList(service?.documents)} hint={LIST_HINT} wide={false} />
        <Area name="notes" label="Important notes" value={formatList(service?.notes)} hint={LIST_HINT} wide={false} />
        <Area name="process" label="Application steps" value={formatSteps(service?.process)} rows={6} hint="One per line: Step title | Description" />
        <Area name="processing" label="Processing information" value={service?.processing} rows={3} />
      </Group>
      <Group title="FAQs">
        <Area name="faqs" label="Questions" value={formatFaqs(service?.faqs)} rows={5} hint="One per line: Question | Answer" />
      </Group>
      <SeoFields seo={service?.seo} />
    </div>
  );
}

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Delete needs an explicit tick, so it can't happen by a stray click. */
export function DeleteCard({ action, id, what, warning }: { action: Action; id: string; what: string; warning: string }) {
  return (
    <Card className="mt-8 border-danger/30 p-5">
      <h2 className="font-semibold text-danger">Delete {what}</h2>
      <p className="mb-3 mt-1 text-sm text-muted">{warning} To hide it temporarily, untick <em>Published</em> instead.</p>
      <ActionForm action={action} submitLabel={`Delete ${what}`} variant="danger">
        <input type="hidden" name="id" value={id} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required className="accent-danger" /> Yes, permanently delete this {what}</label>
      </ActionForm>
    </Card>
  );
}
