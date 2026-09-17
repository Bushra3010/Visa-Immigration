import type { Metadata } from "next";
import { BookingForm } from "@/components/travel/booking-form";
import { BookingShell, LoginToBook, PriceLines, Unavailable } from "@/components/travel/booking-shell";
import { FlightSummary } from "@/components/travel/flight-card";
import { Notice } from "@/components/ui/primitives";
import { DemoBookingNotice } from "@/components/travel/demo-booking-notice";
import { getViewer } from "@/lib/auth";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { AIRPORTS_BY_CODE } from "@/lib/travel/places";
import { revalidateFlight } from "@/lib/travel/service";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Traveller details", robots: { index: false } };

export default async function FlightBookPage({ searchParams }: PageProps<"/flights/book">) {
  const { offer, total, application } = await searchParams;
  if (typeof offer !== "string") return <Unavailable reason="No flight selected." backHref="/flights" />;
  const expected = Number(total) || undefined;

  const [result, viewer] = await Promise.all([revalidateFlight(offer, expected), getViewer()]);
  if (result.status === "unavailable") return <Unavailable reason={result.reason} backHref="/flights" />;
  const o = result.offer;
  const countries = new Set(o.slices.flatMap((s) => [s.from, s.to]).map((c) => AIRPORTS_BY_CODE.get(c)?.countryCode ?? c));
  const self = `/flights/book?offer=${encodeURIComponent(offer)}&total=${o.price.total}`;
  const [firstName, ...rest] = (viewer?.fullName ?? "").split(" ");

  return (
    <BookingShell
      title="Review flight & add travellers"
      step={1}
      summary={
        <>
          <div className="rounded-xl border border-line bg-white p-5"><FlightSummary offer={o} /></div>
          <PriceLines
            currency={o.price.currency}
            total={o.price.total}
            lines={[
              { label: `Base fare (${o.passengers.adults + o.passengers.children + o.passengers.infants} travellers)`, amount: o.price.total - o.price.taxes },
              { label: "Taxes & fees", amount: o.price.taxes },
            ]}
          />
          <div className="rounded-xl border border-line bg-white p-5 text-sm">
            <p className="font-semibold">Fare rules</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">{o.fareRules.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        </>
      }
    >
      {result.priceChanged && result.previousTotal && (
        <Notice tone="warning" className="mb-4">
          The fare changed from {formatMoney(result.previousTotal, o.price.currency)} to <strong>{formatMoney(o.price.total, o.price.currency)}</strong> after rechecking with the airline.
        </Notice>
      )}
      {!isSupabaseAdminConfigured() ? (
        <DemoBookingNotice />
      ) : !viewer ? (
        <LoginToBook next={self} />
      ) : (
        <BookingForm
          offerId={offer}
          flightTotal={o.price.total}
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
