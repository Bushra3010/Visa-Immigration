import type { Metadata } from "next";
import { BookingForm } from "@/components/travel/booking-form";
import { BookingShell, LoginToBook, PriceLines, Unavailable } from "@/components/travel/booking-shell";
import { StaySummary } from "@/components/travel/stay-summary";
import { Notice } from "@/components/ui/primitives";
import { DemoBookingNotice } from "@/components/travel/demo-booking-notice";
import { getViewer } from "@/lib/auth";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { recheckHotelRate } from "@/lib/travel/service";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Guest details", robots: { index: false } };

export default async function HotelBookPage({ searchParams }: PageProps<"/hotels/book">) {
  const { rate, total, application } = await searchParams;
  if (typeof rate !== "string") return <Unavailable reason="No room selected." backHref="/hotels" />;
  const [result, viewer] = await Promise.all([recheckHotelRate(rate, Number(total) || undefined), getViewer()]);
  if (result.status === "unavailable") return <Unavailable reason={result.reason} backHref="/hotels" />;
  const { rate: r, stay } = result;
  const [firstName, ...rest] = (viewer?.fullName ?? "").split(" ");

  return (
    <BookingShell
      title="Review stay & add guest details"
      step={1}
      summary={
        <>
          <StaySummary stay={stay} rate={r} />
          <PriceLines currency={r.price.currency} total={r.price.total} lines={[{ label: "Room charges", amount: r.price.total - r.price.taxes }, { label: "Taxes & fees", amount: r.price.taxes }]} />
        </>
      }
    >
      {result.priceChanged && result.previousTotal && (
        <Notice tone="warning" className="mb-4">The rate changed from {formatMoney(result.previousTotal, r.price.currency)} to <strong>{formatMoney(r.price.total, r.price.currency)}</strong>.</Notice>
      )}
      {!isSupabaseAdminConfigured() ? (
        <DemoBookingNotice />
      ) : !viewer ? (
        <LoginToBook next={`/hotels/book?rate=${encodeURIComponent(rate)}&total=${r.price.total}`} />
      ) : (
        <BookingForm
          rateId={rate}
          hotelTotal={r.price.total}
          currency={r.price.currency}
          applicationId={typeof application === "string" ? application : undefined}
          defaultContact={{ email: viewer.email ?? undefined, firstName, lastName: rest.join(" ") }}
        />
      )}
    </BookingShell>
  );
}
