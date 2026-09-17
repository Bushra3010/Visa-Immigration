import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckList, ContentSection, FaqList, JsonLd, PageHero, TableOfContents, faqJsonLd } from "@/components/site/content-blocks";
import { CtaBand } from "@/components/site/cta-band";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { Container } from "@/components/ui/primitives";
import { CATEGORY_BY_SLUG } from "@/lib/content/categories";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { SERVICE_BY_SLUG, VISA_SERVICES } from "@/lib/content/visa-services";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return VISA_SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/visa/[slug]">): Promise<Metadata> {
  const service = SERVICE_BY_SLUG.get((await params).slug);
  if (!service) return {};
  return {
    title: `${service.title} — Eligibility, Documents & Process`,
    description: service.overview,
    alternates: { canonical: `/visa/${service.slug}` },
    openGraph: { title: service.title, description: service.overview },
  };
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "eligibility", label: "Eligibility" },
  { id: "who", label: "Who can apply" },
  { id: "requirements", label: "Requirements" },
  { id: "documents", label: "Required documents" },
  { id: "process", label: "Application process" },
  { id: "processing", label: "Processing information" },
  { id: "notes", label: "Important notes" },
  { id: "faqs", label: "FAQs" },
];

export default async function VisaServicePage({ params }: PageProps<"/visa/[slug]">) {
  const service = SERVICE_BY_SLUG.get((await params).slug);
  if (!service) notFound();
  const country = COUNTRY_BY_SLUG.get(service.countrySlug);
  const category = CATEGORY_BY_SLUG.get(service.categorySlug);
  const query = `country=${service.countrySlug}&visa=${service.categorySlug}`;

  const requirementRows = [
    ["Age", service.requirements.age],
    ["Education", service.requirements.education],
    ["Work experience", service.requirements.workExperience],
    ["Language", service.requirements.language],
    ["Financial", service.requirements.financial],
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(service.faqs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          description: service.overview,
          serviceType: category?.name,
          areaServed: country?.name,
          provider: { "@type": "Organization", name: site.name, url: site.url },
        }}
      />
      <PageHero
        eyebrow={`${country?.name} · ${category?.name}`}
        title={service.title}
        description={service.overview}
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/visa", label: "Visa services" },
          ...(country ? [{ href: `/countries/${country.slug}`, label: country.name }] : []),
          { label: service.title },
        ]}
      >
        <ButtonLink href={`/eligibility?${query}`} variant="accent" size="lg">Check eligibility</ButtonLink>
        <ButtonLink href={`/consultation?${query}`} variant="secondary" size="lg">Book consultation</ButtonLink>
      </PageHero>
      <Container className="grid gap-10 py-8 lg:grid-cols-[1fr_280px]">
        <article>
          <ContentSection id="overview" title="Overview"><p>{service.overview}</p></ContentSection>
          <ContentSection id="eligibility" title="Eligibility"><CheckList items={service.eligibility} /></ContentSection>
          <ContentSection id="who" title="Who can apply"><CheckList items={service.whoCanApply} /></ContentSection>
          <ContentSection id="requirements" title="Requirements">
            <dl className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {requirementRows.map(([label, value]) => (
                <div key={label} className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]">
                  <dt className="font-medium text-ink">{label}</dt>
                  <dd className="text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          </ContentSection>
          <ContentSection id="documents" title="Required documents"><CheckList items={service.documents} /></ContentSection>
          <ContentSection id="process" title="Application process">
            <ol className="space-y-4">
              {service.process.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{step.title}</p>
                    <p className="text-sm">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ContentSection>
          <ContentSection id="processing" title="Estimated processing information"><p>{service.processing}</p></ContentSection>
          <ContentSection id="notes" title="Important notes">
            <Notice tone="warning"><ul className="list-disc space-y-1 pl-5">{service.notes.map((n) => <li key={n}>{n}</li>)}</ul></Notice>
          </ContentSection>
          <ContentSection id="faqs" title="Frequently asked questions"><FaqList faqs={service.faqs} /></ContentSection>
        </article>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <TableOfContents items={SECTIONS} />
          <div className="rounded-xl bg-accent-50 p-4">
            <p className="font-semibold text-ink">Check if you qualify</p>
            <p className="mt-1 text-sm text-ink-soft">Free assessment, reviewed by a counsellor.</p>
            <ButtonLink href={`/eligibility?${query}`} variant="accent" size="sm" className="mt-3 w-full">Check eligibility</ButtonLink>
            <ButtonLink href={`/consultation?${query}`} variant="secondary" size="sm" className="mt-2 w-full">Book consultation</ButtonLink>
          </div>
          {country && <Link href={`/countries/${country.slug}`} className="block text-sm text-brand-600 hover:underline">← All {country.name} options</Link>}
        </aside>
      </Container>
      <CtaBand />
    </>
  );
}
