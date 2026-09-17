import { Briefcase, Luggage } from "lucide-react";
import type { PricedFlightOffer } from "@/lib/travel/service";
import type { FlightSlice } from "@/lib/travel/types";
import { formatDuration, formatMoney, humanize } from "@/lib/utils";

const time = (iso: string) => iso.slice(11, 16);
const day = (iso: string) => new Date(`${iso}:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export function SliceRow({ slice }: { slice: FlightSlice }) {
  const first = slice.segments[0];
  const last = slice.segments[slice.segments.length - 1];
  const via = slice.segments.slice(0, -1).map((s) => s.to);
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div>
        <p className="text-xl font-semibold text-ink">{time(first.departAt)}</p>
        <p className="text-sm text-muted">{slice.from} · {day(first.departAt)}</p>
      </div>
      <div className="min-w-28 text-center text-xs text-muted">
        <p>{formatDuration(slice.durationMinutes)}</p>
        <div className="relative my-1 h-px bg-line">
          {via.map((v, i) => <span key={i} className="absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent-500" style={{ left: `${((i + 1) / (via.length + 1)) * 100}%` }} />)}
        </div>
        <p className={slice.stops === 0 ? "text-success" : ""}>{slice.stops === 0 ? "Non-stop" : `${slice.stops} stop${slice.stops > 1 ? "s" : ""} · ${via.join(", ")}`}</p>
      </div>
      <div className="text-right">
        <p className="text-xl font-semibold text-ink">{time(last.arriveAt)}</p>
        <p className="text-sm text-muted">{slice.to} · {day(last.arriveAt)}</p>
      </div>
    </div>
  );
}

export function FlightSummary({ offer }: { offer: PricedFlightOffer }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="grid size-8 place-items-center rounded-md bg-brand-50 text-xs font-bold text-brand-700">{offer.validatingCarrier.code}</span>
        <span className="font-medium text-ink">{offer.validatingCarrier.name}</span>
        <span className="text-muted">· {humanize(offer.cabin)}</span>
        <span className="text-muted">· {offer.slices.flatMap((s) => s.segments.map((seg) => seg.flightNumber)).join(", ")}</span>
      </div>
      {offer.slices.map((s, i) => <SliceRow key={i} slice={s} />)}
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><Luggage className="size-4" /> {offer.baggage.checkedKg} kg check-in</span>
        <span className="flex items-center gap-1"><Briefcase className="size-4" /> {offer.baggage.cabinKg} kg cabin</span>
        <span className={offer.refundable ? "text-success" : ""}>{offer.refundable ? "Refundable" : "Non-refundable"}</span>
      </div>
    </div>
  );
}

export function PriceTag({ total, currency, note }: { total: number; currency: string; note?: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-ink">{formatMoney(total, currency)}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}
