import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/content-blocks";
import { CtaBand } from "@/components/site/cta-band";
import { Badge, Container, Section } from "@/components/ui/primitives";
import { CATEGORY_BY_SLUG, VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { VISA_SERVICES } from "@/lib/content/visa-services";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Visa Services",
  description: "Student, work, skilled, visitor, business, family, PR and citizenship visa services for top destinations.",
  alternates: { canonical: "/visa" },
};

export default async function VisaServicesPage({ searchParams }: PageProps<"/visa">) {
  const { category } = await searchParams;
  const active = typeof category === "string" && CATEGORY_BY_SLUG.has(category) ? category : null;
  const services = active ? VISA_SERVICES.filter((s) => s.categorySlug === active) : VISA_SERVICES;

  return (
    <>
      <PageHero eyebrow="Visa services" title="Visa & immigration services" description="Detailed guides for each visa, with eligibility, documents and process." />
      <Section>
        <Container>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Filter by category">
            <Link href="/visa" className={cn("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", !active ? "bg-brand-600 text-white ring-brand-600" : "bg-white")}>All</Link>
            {VISA_CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/visa?category=${c.slug}`} className={cn("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", active === c.slug ? "bg-brand-600 text-white ring-brand-600" : "bg-white")}>
                {c.name}
              </Link>
            ))}
          </div>
          {services.length === 0 ? (
            <p className="mt-8 text-ink-soft">
              We don&apos;t have a published guide for this category yet. <Link href={`/consultation?visa=${active}`} className="text-brand-600 underline">Talk to a counsellor</Link> about your options.
            </p>
          ) : (
            <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/visa/${s.slug}`} className="block h-full rounded-xl border border-line bg-white p-5 hover:border-brand-200 hover:shadow-md">
                    <div className="flex gap-2">
                      <Badge tone="brand">{COUNTRY_BY_SLUG.get(s.countrySlug)?.name}</Badge>
                      <Badge>{CATEGORY_BY_SLUG.get(s.categorySlug)?.name}</Badge>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-ink">{s.title}</p>
                    <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{s.overview}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
