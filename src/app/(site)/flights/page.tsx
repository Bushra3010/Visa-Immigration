import type { Metadata } from "next";
import { PageHero } from "@/components/site/content-blocks";
import { FlightResults } from "@/components/travel/flight-results";
import { TravelSearch } from "@/components/travel/travel-search";
import { Container, EmptyState, Notice, Section } from "@/components/ui/primitives";
import { AIRPORTS_BY_CODE } from "@/lib/travel/places";
import { flightSearchFromParams } from "@/lib/travel/schemas";
import { searchDefaultsFromParams } from "@/lib/travel/search-defaults";
import { searchFlights, type PricedFlightOffer } from "@/lib/travel/service";

export const metadata: Metadata = {
  title: "Flight Booking — Domestic & International Flights",
  description: "Search and book domestic and international flights with live fares, filters and instant e-tickets.",
  alternates: { canonical: "/flights" },
};

export default async function FlightsPage({ searchParams }: PageProps<"/flights">) {
  const params = await searchParams;
  // Set when travel is booked from an approved visa application (PRD §7.4).
  const application = typeof params.application === "string" && /^[0-9a-f-]{36}$/i.test(params.application) ? params.application : undefined;
  const hasQuery = Boolean(params.from || params.to || params.leg);
  const parsed = hasQuery ? flightSearchFromParams(params) : null;

  let offers: PricedFlightOffer[] | null = null;
  let error: string | null = null;
  if (parsed?.success) {
    try {
      offers = await searchFlights(parsed.data);
    } catch (err) {
      console.error("Flight search failed", err);
      error = "Flight search is temporarily unavailable. Please try again shortly.";
    }
  } else if (parsed && !parsed.success) {
    error = parsed.error.issues[0]?.message ?? "Please check your search.";
  }

  const city = (code: string) => AIRPORTS_BY_CODE.get(code)?.city ?? code;
  const route = parsed?.success
    ? parsed.data.tripType === "multi_city"
      ? [parsed.data.legs[0].from, ...parsed.data.legs.map((l) => l.to)].map(city).join(" → ")
      : `${city(parsed.data.legs[0].from)} → ${city(parsed.data.legs[0].to)}`
    : null;

  return (
    <>
      <PageHero eyebrow="Travel" title={route ? `Flights: ${route}` : "Book flights"} description={route ? undefined : "Domestic and international flights with live fares."} />
      <Container className="-mt-8">
        <TravelSearch initialTab="flights" tabs={false} defaults={searchDefaultsFromParams(params)} carryParams={application ? { application } : undefined} />
      </Container>
      <Section className="pt-8">
        <Container>
          {error && <Notice tone="danger" className="mb-6">{error}</Notice>}
          {offers && offers.length > 0 && <FlightResults offers={offers} selectHref={application ? `/flights/book?application=${application}` : undefined} />}
          {offers && offers.length === 0 && <EmptyState title="No flights found" description="Try different dates or nearby airports." />}
          {!hasQuery && <EmptyState title="Search for flights" description="Enter your route and dates above to see live fares." />}
        </Container>
      </Section>
    </>
  );
}

