import type { Metadata } from "next";
import { PageHero } from "@/components/site/content-blocks";
import { OfferCard } from "@/components/site/offers-section";
import { Container, Section } from "@/components/ui/primitives";
import { OFFERS } from "@/lib/content/offers";

export const metadata: Metadata = { title: "Offers", description: "Current offers on flights, hotels, holidays and visa services.", alternates: { canonical: "/offers" } };

export default function OffersPage() {
  return (
    <>
      <PageHero eyebrow="Offers" title="All offers" description="T&C's apply to every offer." />
      <Section>
        <Container>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((o) => <li key={o.id}><OfferCard offer={o} /></li>)}
          </ul>
        </Container>
      </Section>
    </>
  );
}
