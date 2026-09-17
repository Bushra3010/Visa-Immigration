import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/content-blocks";
import { FlightSummary } from "@/components/travel/flight-card";
import { FlightResults } from "@/components/travel/flight-results";
import { HotelResults } from "@/components/travel/hotel-results";
import { TravelSearch } from "@/components/travel/travel-search";
import { Container, EmptyState, Notice, Section } from "@/components/ui/primitives";
import { AIRPORTS_BY_CODE, HOTEL_DESTINATIONS } from "@/lib/travel/places";
import { nightsBetween, pickQuery } from "@/lib/travel/query";
import { flightSearchSchema, hotelSearchSchema } from "@/lib/travel/schemas";
import { searchDefaultsFromParams } from "@/lib/travel/search-defaults";
import { revalidateFlight, searchFlights, searchHotels } from "@/lib/travel/service";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Flight + Hotel Packages",
  description: "Plan your trip in one flow — book flights and hotels together under a single booking reference.",
  alternates: { canonical: "/flight-hotel" },
};

const PACKAGE_KEYS = ["from", "to", "depart", "return", "adults", "rooms"];

export default async function FlightHotelPage({ searchParams }: PageProps<"/flight-hotel">) {
  const params = await searchParams;
  const get = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : "");
  const hasQuery = Boolean(get("from") && get("to"));
  const adults = Number(get("adults") || 1);
  const rooms = Math.min(Math.max(Number(get("rooms") || 1), 1), 4);
  const baseQuery = pickQuery(params, PACKAGE_KEYS);

  const flightReq = flightSearchSchema.safeParse({
    tripType: "round_trip",
    legs: [{ from: get("from"), to: get("to"), date: get("depart") }, { from: get("to"), to: get("from"), date: get("return") }],
    passengers: { adults, children: 0, infants: 0 },
    cabin: "economy",
  });

  const offerId = get("offer");
  const toCity = AIRPORTS_BY_CODE.get(get("to"))?.city;
  const destination = HOTEL_DESTINATIONS.find((d) => d.city === toCity);

  let body: React.ReactNode;
  if (!hasQuery) {
    body = <EmptyState title="Plan your trip" description="Enter your route, dates, travellers and rooms above." />;
  } else if (!flightReq.success) {
    body = <Notice tone="danger">{flightReq.error.issues[0]?.message}</Notice>;
  } else if (!offerId) {
    const offers = await searchFlights(flightReq.data);
    body = (
      <>
        <h2 className="mb-4 text-xl font-semibold">Step 1 of 2 · Choose your flight</h2>
        <FlightResults offers={offers} selectHref={`/flight-hotel?${baseQuery}`} selectLabel="Select flight" />
      </>
    );
  } else {
    const flight = await revalidateFlight(offerId, Number(get("total")) || undefined);
    if (flight.status === "unavailable") {
      body = <Notice tone="danger">{flight.reason} <Link className="underline" href={`/flight-hotel?${baseQuery}`}>Choose another flight</Link></Notice>;
    } else if (!destination) {
      body = <Notice tone="warning">Hotels aren&apos;t available for this destination yet.</Notice>;
    } else {
      const perRoom = Math.max(1, Math.floor(adults / rooms));
      const hotelReq = hotelSearchSchema.parse({
        destination: destination.code,
        checkIn: get("depart"),
        checkOut: get("return"),
        rooms: Array.from({ length: rooms }, (_, i) => ({ adults: perRoom + (i < adults % rooms ? 1 : 0), children: 0 })),
      });
      const hotels = await searchHotels(hotelReq);
      const detailQuery = new URLSearchParams({
        ...Object.fromEntries(new URLSearchParams(baseQuery)),
        destination: destination.code,
        checkin: get("depart"),
        checkout: get("return"),
        offer: offerId,
        ftotal: String(flight.offer.price.total),
      }).toString();
      body = (
        <>
          <div className="mb-8 rounded-xl border border-brand-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-brand-700">Selected flight · {formatMoney(flight.offer.price.total, flight.offer.price.currency)}</p>
              <Link href={`/flight-hotel?${baseQuery}`} className="text-sm text-brand-600 hover:underline">Change flight</Link>
            </div>
            <div className="mt-4"><FlightSummary offer={flight.offer} /></div>
          </div>
          <h2 className="mb-4 text-xl font-semibold">Step 2 of 2 · Choose your hotel in {destination.city}</h2>
          <HotelResults hotels={hotels} detailQuery={detailQuery} nights={nightsBetween(hotelReq.checkIn, hotelReq.checkOut)} />
        </>
      );
    }
  }

  return (
    <>
      <PageHero eyebrow="Travel" title="Flight + Hotel" description="Book both in one flow, grouped under a single Travel Booking ID." />
      <Container className="-mt-8"><TravelSearch initialTab="package" tabs={false} defaults={searchDefaultsFromParams(params)} /></Container>
      <Section className="pt-8"><Container>{body}</Container></Section>
    </>
  );
}
