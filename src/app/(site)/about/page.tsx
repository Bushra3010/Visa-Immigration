import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { CheckList, PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { site, siteAddress } from "@/lib/site";

export const metadata: Metadata = { title: "About Us", description: `About ${site.name}.`, alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title={`About ${site.name}`} description="Immigration consultancy and travel booking, brought together in one place." />
      <Section>
        <Container className="max-w-3xl space-y-6 text-ink-soft">
          <p>We help students, professionals, families and businesses explore opportunities abroad — from the first eligibility check through to the day they fly.</p>
          <CheckList items={["Dedicated counsellors by destination", "Secure online document uploads", "Real-time application tracking", "Flights and hotels booked in the same account"]} />

          <section aria-labelledby="business-details" className="rounded-xl border border-line bg-white p-6">
            <h2 id="business-details" className="text-lg font-semibold text-ink">Business details</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[180px_1fr]">
              <dt className="font-medium text-ink">Trade name</dt><dd>{site.business.tradeName}</dd>
              <dt className="font-medium text-ink">Legal name</dt><dd>{site.business.legalName}</dd>
              <dt className="font-medium text-ink">Constitution</dt><dd>{site.business.constitution} (Proprietor: {site.business.proprietor})</dd>
              <dt className="font-medium text-ink">Registered address</dt><dd>{siteAddress}, {site.contact.address.state}, {site.contact.address.country}</dd>
              <dt className="font-medium text-ink">GSTIN</dt><dd className="font-mono">{site.business.gstin}</dd>
              <dt className="font-medium text-ink">Udyam registration</dt><dd className="font-mono">{site.business.udyam} ({site.business.enterpriseType} enterprise)</dd>
            </dl>
          </section>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
