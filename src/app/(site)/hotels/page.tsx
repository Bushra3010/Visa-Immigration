import type { Metadata } from "next";
import { PageHero } from "@/components/site/content-blocks";
import { HotelResults } from "@/components/travel/hotel-results";
import { TravelSearch } from "@/components/travel/travel-search";
import { Container, EmptyState, Notice, Section } from "@/components/ui/primitives";
import { HOTEL_DESTINATIONS } from "@/lib/travel/places";
import { HOTEL_QUERY_KEYS, nightsBetween, pickQuery } from "@/lib/travel/query";
import { hotelSearchFromParams } from "@/lib/travel/schemas";
import { searchDefaultsFromParams } from "@/lib/travel/search-defaults";
import { searchHotels, type PricedHotelSummary } from "@/lib/travel/service";

export const metadata: Metadata = {
  title: "Hotel Booking — Hotels in India & Worldwide",
  description: "Search hotels with live availability, compare room rates and cancellation policies, and book instantly.",
  alternates: { canonical: "/hotels" },
};

export default async function HotelsPage({ searchParams }: PageProps<"/hotels">) {
  const params = await searchParams;
  const application = typeof params.application === "string" && /^[0-9a-f-]{36}$/i.test(params.application) ? params.application : undefined;
  const hasQuery = Boolean(params.destination);
  const parsed = hasQuery ? hotelSearchFromParams(params) : null;

  let hotels: PricedHotelSummary[] | null = null;
  let error: string | null = null;
  if (parsed?.success) {
    try {
      hotels = await searchHotels(parsed.data);
    } catch (err) {
      console.error("Hotel search failed", err);
      error = "Hotel search is temporarily unavailable. Please try again shortly.";
    }
  } else if (parsed) {
    error = parsed.error.issues[0]?.message ?? "Please check your search.";
  }
  const city = HOTEL_DESTINATIONS.find((d) => d.code === params.destination)?.city;

  return (
    <>
      <PageHero eyebrow="Travel" title={city ? `Hotels in ${city}` : "Book hotels"} description={city ? undefined : "Compare rooms, rates and cancellation policies."} />
      <Container className="-mt-8"><TravelSearch initialTab="hotels" tabs={false} defaults={searchDefaultsFromParams(params)} carryParams={application ? { application } : undefined} /></Container>
      <Section className="pt-8">
        <Container>
          {error && <Notice tone="danger" className="mb-6">{error}</Notice>}
          {hotels && hotels.length > 0 && parsed?.success && (
            <HotelResults hotels={hotels} detailQuery={pickQuery(params, [...HOTEL_QUERY_KEYS, "application"])} nights={nightsBetween(parsed.data.checkIn, parsed.data.checkOut)} />
          )}
          {hotels?.length === 0 && <EmptyState title="No hotels found" description="Try different dates or a nearby city." />}
          {!hasQuery && <EmptyState title="Search for hotels" description="Enter a destination and dates above." />}
        </Container>
      </Section>
    </>
  );
}
