import { Check, X } from "lucide-react";
import type { PricedRoomRate } from "@/lib/travel/service";
import type { HotelStay } from "@/lib/travel/types";
import { formatDate } from "@/lib/utils";
import { Stars, mealLabel } from "./hotel-card";

export function StaySummary({ stay, rate }: { stay: HotelStay; rate: PricedRoomRate }) {
  const guests = stay.rooms.reduce((n, r) => n + r.adults + r.children, 0);
  return (
    <div className="rounded-xl border border-line bg-white p-5 text-sm">
      <Stars count={stay.hotel.starRating} />
      <p className="mt-1 text-base font-semibold text-ink">{stay.hotel.name}</p>
      <p className="text-muted">{stay.hotel.address}, {stay.hotel.city}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        <div><dt className="text-muted">Check-in</dt><dd className="font-medium">{formatDate(stay.checkIn)}</dd></div>
        <div><dt className="text-muted">Check-out</dt><dd className="font-medium">{formatDate(stay.checkOut)}</dd></div>
        <div><dt className="text-muted">Room</dt><dd className="font-medium">{stay.rooms.length} × {rate.roomName}</dd></div>
        <div><dt className="text-muted">Guests</dt><dd className="font-medium">{guests}</dd></div>
      </dl>
      <p className="mt-3 text-ink-soft">{mealLabel(rate.mealPlan)}</p>
      <p className={`mt-2 flex gap-1.5 ${rate.refundable ? "text-success" : "text-ink-soft"}`}>
        {rate.refundable ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}{rate.cancellationPolicy}
      </p>
    </div>
  );
}
