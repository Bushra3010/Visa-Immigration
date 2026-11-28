import type { Metadata } from "next";
import { PageHero } from "@/components/site/content-blocks";
import { OfferCard } from "@/components/site/offers-section";
import { Container, Section } from "@/components/ui/primitives";
import { VISIBLE_OFFERS } from "@/lib/content/offers";

export const metadata: Metadata = { title: "Offers", description: "Current offers on visa and immigration services.", alternates: { canonical: "/offers" } };

export default function OffersPage() {
  return (
    <>
      <PageHero eyebrow="Offers" title="All offers" description="T&C's apply to every offer." />
      <Section>
        <Container>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {VISIBLE_OFFERS.map((o) => <li key={o.id}><OfferCard offer={o} /></li>)}
          </ul>
        </Container>
      </Section>
    </>
  );
}
