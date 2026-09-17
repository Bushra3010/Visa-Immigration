import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/site/content-blocks";
import { CtaBand } from "@/components/site/cta-band";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container, Section } from "@/components/ui/primitives";
import { CATEGORY_BY_SLUG, SERVICE_NAV } from "@/lib/content/categories";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { servicesForCategories } from "@/lib/content/visa-services";

// Top-level service landing pages: /work-abroad, /study-abroad, ... (PRD §5.1)
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_NAV.map((s) => ({ service: s.href.slice(1) }));
}

const findService = (slug: string) => SERVICE_NAV.find((s) => s.href === `/${slug}`);

export async function generateMetadata({ params }: PageProps<"/[service]">): Promise<Metadata> {
  const nav = findService((await params).service);
  if (!nav) return {};
  const cats = nav.categories.map((c) => CATEGORY_BY_SLUG.get(c)!);
  return { title: nav.label, description: cats.map((c) => c.description).join(" "), alternates: { canonical: nav.href } };
}

export default async function ServiceLandingPage({ params }: PageProps<"/[service]">) {
  const nav = findService((await params).service);
  if (!nav) notFound();
  const categories = nav.categories.map((c) => CATEGORY_BY_SLUG.get(c)!);
  const services = servicesForCategories(nav.categories);

  return (
    <>
      <PageHero eyebrow="Visa services" title={nav.label} description={categories.map((c) => c.description).join(" ")}>
        <ButtonLink href={`/eligibility?visa=${nav.categories[0]}`} variant="accent" size="lg">Get free assessment</ButtonLink>
        <ButtonLink href={`/consultation?visa=${nav.categories[0]}`} variant="secondary" size="lg">Talk to counsellor</ButtonLink>
      </PageHero>
      <Section>
        <Container>
          <h2 className="text-xl font-semibold">Available programs</h2>
          {services.length === 0 ? (
            <p className="mt-4 text-ink-soft">Our counsellors can advise on {nav.label.toLowerCase()} options for your destination — <Link href="/consultation" className="text-brand-600 underline">book a consultation</Link>.</p>
          ) : (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <li key={s.slug}>
                  <Link href={`/visa/${s.slug}`} className="block h-full rounded-xl border border-line bg-white p-5 hover:border-brand-200 hover:shadow-md">
                    <Badge tone="brand">{COUNTRY_BY_SLUG.get(s.countrySlug)?.name}</Badge>
                    <p className="mt-3 text-lg font-semibold">{s.title}</p>
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
