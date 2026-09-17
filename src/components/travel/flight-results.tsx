"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import type { PricedFlightOffer } from "@/lib/travel/service";
import { cn, formatDuration, formatMoney } from "@/lib/utils";
import { FlightSummary, PriceTag } from "./flight-card";

type Sort = "recommended" | "cheapest" | "fastest" | "earliest";

const TIME_BANDS = [
  { id: "early", label: "Before 6 AM", from: 0, to: 6 },
  { id: "morning", label: "6 AM – 12 PM", from: 6, to: 12 },
  { id: "afternoon", label: "12 PM – 6 PM", from: 12, to: 18 },
  { id: "evening", label: "After 6 PM", from: 18, to: 24 },
];

const hour = (iso: string) => Number(iso.slice(11, 13));
const totalDuration = (o: PricedFlightOffer) => o.slices.reduce((s, x) => s + x.durationMinutes, 0);
const maxStops = (o: PricedFlightOffer) => Math.max(...o.slices.map((s) => s.stops));

/** `selectHref` receives `offer` and `total` query params appended. */
export function FlightResults({ offers, selectHref = "/flights/book", selectLabel = "Select" }: { offers: PricedFlightOffer[]; selectHref?: string; selectLabel?: string }) {
  const hrefFor = (o: PricedFlightOffer) => {
    const url = new URLSearchParams(selectHref.split("?")[1]);
    url.set("offer", o.offerId);
    url.set("total", String(o.price.total));
    return `${selectHref.split("?")[0]}?${url}`;
  };
  const priceBounds = useMemo(() => {
    const prices = offers.map((o) => o.price.total);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [offers]);
  const airlines = useMemo(() => Array.from(new Map(offers.map((o) => [o.validatingCarrier.code, o.validatingCarrier.name]))), [offers]);

  const [sort, setSort] = useState<Sort>("recommended");
  const [maxPrice, setMaxPrice] = useState(priceBounds.max);
  const [stops, setStops] = useState<number[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [departBands, setDepartBands] = useState<string[]>([]);
  const [arriveBands, setArriveBands] = useState<string[]>([]);
  const [minBaggage, setMinBaggage] = useState(0);
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const inBands = (h: number, bands: string[]) => bands.length === 0 || TIME_BANDS.some((b) => bands.includes(b.id) && h >= b.from && h < b.to);
    const list = offers.filter((o) => {
      const out = o.slices[0];
      return (
        o.price.total <= maxPrice &&
        (stops.length === 0 || stops.includes(Math.min(maxStops(o), 2))) &&
        (selectedAirlines.length === 0 || selectedAirlines.includes(o.validatingCarrier.code)) &&
        inBands(hour(out.segments[0].departAt), departBands) &&
        inBands(hour(out.segments[out.segments.length - 1].arriveAt), arriveBands) &&
        o.baggage.checkedKg >= minBaggage &&
        (!refundableOnly || o.refundable)
      );
    });
    const minPrice = Math.min(...offers.map((o) => o.price.total));
    const minDur = Math.min(...offers.map(totalDuration));
    const score = (o: PricedFlightOffer) => (o.price.total / minPrice) * 0.6 + (totalDuration(o) / minDur) * 0.3 + maxStops(o) * 0.1;
    const sorters: Record<Sort, (a: PricedFlightOffer, b: PricedFlightOffer) => number> = {
      recommended: (a, b) => score(a) - score(b),
      cheapest: (a, b) => a.price.total - b.price.total,
      fastest: (a, b) => totalDuration(a) - totalDuration(b),
      earliest: (a, b) => a.slices[0].segments[0].departAt.localeCompare(b.slices[0].segments[0].departAt),
    };
    return [...list].sort(sorters[sort]);
  }, [offers, maxPrice, stops, selectedAirlines, departBands, arriveBands, minBaggage, refundableOnly, sort]);

  const cheapest = [...offers].sort((a, b) => a.price.total - b.price.total)[0];
  const fastest = [...offers].sort((a, b) => totalDuration(a) - totalDuration(b))[0];

  const toggle = <T,>(list: T[], value: T, set: (v: T[]) => void) => set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const reset = () => { setMaxPrice(priceBounds.max); setStops([]); setSelectedAirlines([]); setDepartBands([]); setArriveBands([]); setMinBaggage(0); setRefundableOnly(false); };

  const checkbox = (checked: boolean, onChange: () => void, label: React.ReactNode, key: string) => (
    <label key={key} className="flex items-center gap-2 py-1 text-sm text-ink-soft">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-brand-600" /> {label}
    </label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className={cn("space-y-6 rounded-xl border border-line bg-white p-4 lg:block lg:self-start", filtersOpen ? "block" : "hidden")} aria-label="Filters">
        <div className="flex items-center justify-between">
          <p className="font-semibold">Filters</p>
          <button type="button" onClick={reset} className="text-sm text-brand-600 hover:underline">Reset</button>
        </div>
        <div>
          <p className="text-sm font-medium">Max price</p>
          <input type="range" min={priceBounds.min} max={priceBounds.max} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-2 w-full accent-brand-600" aria-label="Maximum price" />
          <p className="text-xs text-muted">Up to {formatMoney(maxPrice)}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Stops</p>
          {[0, 1, 2].map((n) => checkbox(stops.includes(n), () => toggle(stops, n, setStops), n === 0 ? "Non-stop" : n === 1 ? "1 stop" : "2+ stops", `s${n}`))}
        </div>
        <div>
          <p className="text-sm font-medium">Departure time</p>
          {TIME_BANDS.map((b) => checkbox(departBands.includes(b.id), () => toggle(departBands, b.id, setDepartBands), b.label, `d${b.id}`))}
        </div>
        <div>
          <p className="text-sm font-medium">Arrival time</p>
          {TIME_BANDS.map((b) => checkbox(arriveBands.includes(b.id), () => toggle(arriveBands, b.id, setArriveBands), b.label, `a${b.id}`))}
        </div>
        <div>
          <p className="text-sm font-medium">Airlines</p>
          {airlines.map(([code, name]) => checkbox(selectedAirlines.includes(code), () => toggle(selectedAirlines, code, setSelectedAirlines), name, code))}
        </div>
        <div>
          <p className="text-sm font-medium">Baggage</p>
          <select value={minBaggage} onChange={(e) => setMinBaggage(Number(e.target.value))} className="mt-2 h-9 w-full rounded-lg border border-line px-2 text-sm" aria-label="Minimum checked baggage">
            <option value={0}>Any</option>
            <option value={23}>23 kg or more</option>
            <option value={30}>30 kg or more</option>
            <option value={40}>40 kg or more</option>
          </select>
        </div>
        {checkbox(refundableOnly, () => setRefundableOnly(!refundableOnly), "Refundable fares only", "ref")}
      </aside>

      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Sort results">
          {([
            ["recommended", "Recommended", null],
            ["cheapest", "Cheapest", cheapest && formatMoney(cheapest.price.total)],
            ["fastest", "Fastest", fastest && formatDuration(totalDuration(fastest))],
            ["earliest", "Earliest", null],
          ] as const).map(([id, label, sub]) => (
            <button key={id} role="tab" aria-selected={sort === id} onClick={() => setSort(id)} className={cn("rounded-lg border px-3 py-2 text-left text-sm", sort === id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white")}>
              <span className="font-medium">{label}</span>
              {sub && <span className="block text-xs text-muted">{sub}</span>}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <p aria-live="polite">{filtered.length} of {offers.length} flights</p>
          <button type="button" className="flex items-center gap-1 text-brand-600 lg:hidden" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal className="size-4" /> {filtersOpen ? "Hide filters" : "Filters"}
          </button>
        </div>

        <ul className="mt-3 space-y-3">
          {filtered.map((offer) => (
            <li key={offer.offerId} className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-[1fr_200px] sm:p-5">
              <FlightSummary offer={offer} />
              <div className="flex flex-row items-center justify-between gap-3 border-t border-line pt-4 sm:flex-col sm:items-end sm:justify-center sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <PriceTag total={offer.price.total} currency={offer.price.currency} note={`total for all travellers${offer.seatsLeft && offer.seatsLeft < 5 ? ` · ${offer.seatsLeft} seats left` : ""}`} />
                <Link href={hrefFor(offer)} className={buttonClass("accent")}>{selectLabel}</Link>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
              No flights match these filters. <button onClick={reset} className="text-brand-600 underline">Reset filters</button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
