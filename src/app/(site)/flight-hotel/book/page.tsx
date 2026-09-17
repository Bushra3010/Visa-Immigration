import type { Metadata } from "next";
import { BookingForm } from "@/components/travel/booking-form";
import { BookingShell, LoginToBook, PriceLines, Unavailable } from "@/components/travel/booking-shell";
import { FlightSummary } from "@/components/travel/flight-card";
import { StaySummary } from "@/components/travel/stay-summary";
import { Notice } from "@/components/ui/primitives";
import { DemoBookingNotice } from "@/components/travel/demo-booking-notice";
import { getViewer } from "@/lib/auth";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { AIRPORTS_BY_CODE } from "@/lib/travel/places";
import { recheckHotelRate, revalidateFlight } from "@/lib/travel/service";

export const metadata: Metadata = { title: "Review your trip", robots: { index: false } };

export default async function PackageBookPage({ searchParams }: PageProps<"/flight-hotel/book">) {
  const { offer, ftotal, rate, htotal, application } = await searchParams;
  if (typeof offer !== "string" || typeof rate !== "string") return <Unavailable reason="Select a flight and a hotel first." backHref="/flight-hotel" />;

  const [flight, hotel, viewer] = await Promise.all([
    revalidateFlight(offer, Number(ftotal) || undefined),
    recheckHotelRate(rate, Number(htotal) || undefined),
    getViewer(),
  ]);
  if (flight.status === "unavailable") return <Unavailable reason={flight.reason} backHref="/flight-hotel" />;
  if (hotel.status === "unavailable") return <Unavailable reason={hotel.reason} backHref="/flight-hotel" />;

  const o = flight.offer;
  const countries = new Set(o.slices.flatMap((s) => [s.from, s.to]).map((c) => AIRPORTS_BY_CODE.get(c)?.countryCode ?? c));
  const total = o.price.total + hotel.rate.price.total;
  const self = `/flight-hotel/book?offer=${encodeURIComponent(offer)}&ftotal=${o.price.total}&rate=${encodeURIComponent(rate)}&htotal=${hotel.rate.price.total}`;
  const [firstName, ...rest] = (viewer?.fullName ?? "").split(" ");

  return (
    <BookingShell
      title="Review your trip & add travellers"
      step={1}
      summary={
        <>
          <div className="rounded-xl border border-line bg-white p-5"><FlightSummary offer={o} /></div>
          <StaySummary stay={hotel.stay} rate={hotel.rate} />
          <PriceLines currency={o.price.currency} total={total} lines={[{ label: "Flights", amount: o.price.total }, { label: "Hotel", amount: hotel.rate.price.total }]} />
        </>
      }
    >
      {(flight.priceChanged || hotel.priceChanged) && <Notice tone="warning" className="mb-4">Prices were updated after rechecking with our suppliers. The summary shows the latest total.</Notice>}
      {!isSupabaseAdminConfigured() ? (
        <DemoBookingNotice />
      ) : !viewer ? (
        <LoginToBook next={self} />
      ) : (
        <BookingForm
          offerId={offer}
          flightTotal={o.price.total}
          rateId={rate}
          hotelTotal={hotel.rate.price.total}
          passengers={o.passengers}
          international={countries.size > 1}
          applicationId={typeof application === "string" ? application : undefined}
          currency={o.price.currency}
          defaultContact={{ email: viewer.email ?? undefined, firstName, lastName: rest.join(" ") }}
        />
      )}
    </BookingShell>
  );
}
