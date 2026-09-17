import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { CheckList, PageHero } from "@/components/site/content-blocks";
import { Container, Section } from "@/components/ui/primitives";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About Us", description: `About ${site.name}.`, alternates: { canonical: "/about" } };

// Placeholder: company information to be supplied by the business (PRD §15).
export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About us" title={`About ${site.name}`} description="Immigration consultancy and travel booking, brought together in one place." />
      <Section>
        <Container className="max-w-3xl space-y-6 text-ink-soft">
          <p>We help students, professionals, families and businesses explore opportunities abroad — from the first eligibility check through to the day they fly.</p>
          <CheckList items={["Dedicated counsellors by destination", "Secure online document uploads", "Real-time application tracking", "Flights and hotels booked in the same account"]} />
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
