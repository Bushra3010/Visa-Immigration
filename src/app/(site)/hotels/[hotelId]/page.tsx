import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Unavailable } from "@/components/travel/booking-shell";
import { HotelImage, Stars, mealLabel } from "@/components/travel/hotel-card";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";
import { HOTEL_QUERY_KEYS, nightsBetween, pickQuery } from "@/lib/travel/query";
import { hotelSearchFromParams } from "@/lib/travel/schemas";
import { getHotelDetails } from "@/lib/travel/service";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Choose your room", robots: { index: false } };

export default async function HotelDetailPage({ params, searchParams }: PageProps<"/hotels/[hotelId]">) {
  const { hotelId } = await params;
  const query = await searchParams;
  const parsed = hotelSearchFromParams(query);
  const backHref = `/hotels?${pickQuery(query, HOTEL_QUERY_KEYS)}`;
  if (!parsed.success) return <Unavailable reason={parsed.error.issues[0]?.message ?? "Invalid dates"} backHref={backHref} />;

  const hotel = await getHotelDetails(decodeURIComponent(hotelId), parsed.data);
  if (!hotel) return <Unavailable reason="Hotel not found." backHref={backHref} />;
  const nights = nightsBetween(parsed.data.checkIn, parsed.data.checkOut);

  // In the Flight + Hotel flow the chosen flight is carried through the URL.
  const packageOffer = typeof query.offer === "string" ? query.offer : null;
  const selectHref = (rateId: string, total: number) =>
    packageOffer
      ? `/flight-hotel/book?offer=${encodeURIComponent(packageOffer)}&ftotal=${query.ftotal}&rate=${encodeURIComponent(rateId)}&htotal=${total}`
      : `/hotels/book?rate=${encodeURIComponent(rateId)}&total=${total}${typeof query.application === "string" ? `&application=${encodeURIComponent(query.application)}` : ""}`;

  return (
    <Container className="py-8">
      <Link href={packageOffer ? `/flight-hotel?${pickQuery(query, ["from", "to", "depart", "return", "adults", "rooms"])}&offer=${encodeURIComponent(packageOffer)}&total=${query.ftotal}` : backHref} className="text-sm text-brand-600 hover:underline">← Back to results</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <HotelImage name={hotel.name} className="h-56 w-full sm:h-72" />
          <div className="mt-4 flex items-center gap-2"><Stars count={hotel.starRating} /><span className="text-sm text-muted">{hotel.category}</span></div>
          <h1 className="mt-1 text-3xl font-semibold">{hotel.name}</h1>
          <p className="text-muted">{hotel.address}, {hotel.city}</p>
          <p className="mt-4 text-ink-soft">{hotel.description}</p>
        </div>
        <aside className="space-y-4 rounded-xl border border-line bg-white p-5 lg:self-start">
          <div>
            <p className="font-semibold">Amenities</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-ink-soft">{hotel.amenities.map((a) => <li key={a}>• {a}</li>)}</ul>
          </div>
          <div>
            <p className="font-semibold">Policies</p>
            <ul className="mt-2 space-y-1 text-sm text-ink-soft">{hotel.policies.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </aside>
      </div>

      <h2 className="mt-10 text-xl font-semibold">Available rooms</h2>
      <p className="text-sm text-muted">{parsed.data.checkIn} → {parsed.data.checkOut} · {nights} night{nights > 1 ? "s" : ""} · {parsed.data.rooms.length} room{parsed.data.rooms.length > 1 ? "s" : ""}</p>
      <ul className="mt-4 space-y-3">
        {hotel.rates.map((r) => (
          <li key={r.rateId} className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-[1fr_220px]">
            <div>
              <p className="text-lg font-semibold">{r.roomName}</p>
              <p className="text-sm text-ink-soft">{mealLabel(r.mealPlan)}</p>
              <p className={`mt-3 flex items-start gap-1.5 text-sm ${r.refundable ? "text-success" : "text-ink-soft"}`}>
                {r.refundable ? <Check className="mt-0.5 size-4 shrink-0" /> : <X className="mt-0.5 size-4 shrink-0" />}
                {r.cancellationPolicy}
              </p>
            </div>
            <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end sm:justify-center">
              <div className="text-right">
                <p className="text-2xl font-semibold">{formatMoney(r.price.total, r.price.currency)}</p>
                <p className="text-xs text-muted">incl. {formatMoney(r.price.taxes, r.price.currency)} taxes</p>
              </div>
              <Link href={selectHref(r.rateId, r.price.total)} className={buttonClass("accent", "md", "mt-2")}>Select room</Link>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}
