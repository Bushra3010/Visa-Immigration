import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { COUNTRIES } from "@/lib/content/countries";
import { servicesForCountry } from "@/lib/content/visa-services";

export const metadata: Metadata = {
  title: "Immigration Destinations",
  description: "Explore immigration, study, work and visit visa options for Canada, Australia, the UK, USA, Germany, New Zealand, the UAE and Europe.",
  alternates: { canonical: "/countries" },
};

export default function CountriesPage() {
  return (
    <>
      <PageHero eyebrow="Destinations" title="Choose your destination" description="Compare immigration pathways and find the visa that fits your goals." />
      <Section>
        <Container className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COUNTRIES.map((c) => (
            <Link key={c.slug} href={`/countries/${c.slug}`} className="group rounded-xl border border-line bg-white p-6 hover:border-brand-200 hover:shadow-md">
              <p className="text-xs font-semibold text-brand-600">{c.region}</p>
              <h2 className="mt-1 text-xl font-semibold group-hover:text-brand-700">{c.name} Immigration</h2>
              <p className="mt-2 text-sm text-ink-soft">{c.tagline}</p>
              <p className="mt-4 text-xs text-muted">{servicesForCountry(c.slug).length} visa services · {c.immigrationOptions.length} pathways</p>
            </Link>
          ))}
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
