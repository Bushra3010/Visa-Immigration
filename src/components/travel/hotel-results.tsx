"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PricedHotelSummary } from "@/lib/travel/service";
import { cn, formatMoney } from "@/lib/utils";
import { HotelImage, Stars } from "./hotel-card";

type Sort = "recommended" | "price_asc" | "price_desc" | "rating";

export function HotelResults({ hotels, detailQuery, nights }: { hotels: PricedHotelSummary[]; detailQuery: string; nights: number }) {
  const bounds = useMemo(() => {
    const p = hotels.map((h) => h.fromPrice.total);
    return { min: Math.floor(Math.min(...p)), max: Math.ceil(Math.max(...p)) };
  }, [hotels]);
  const amenities = useMemo(() => Array.from(new Set(hotels.flatMap((h) => h.amenities))).sort(), [hotels]);
  const categories = useMemo(() => Array.from(new Set(hotels.map((h) => h.category))).sort(), [hotels]);

  const [sort, setSort] = useState<Sort>("recommended");
  const [maxPrice, setMaxPrice] = useState(bounds.max);
  const [stars, setStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minRating, setMinRating] = useState(0);

  const list = useMemo(() => {
    const filtered = hotels.filter((h) =>
      h.fromPrice.total <= maxPrice &&
      (stars.length === 0 || stars.includes(h.starRating)) &&
      selectedAmenities.every((a) => h.amenities.includes(a)) &&
      (selectedCategories.length === 0 || selectedCategories.includes(h.category)) &&
      (h.guestRating ?? 0) >= minRating,
    );
    const sorters: Record<Sort, (a: PricedHotelSummary, b: PricedHotelSummary) => number> = {
      recommended: (a, b) => (b.guestRating ?? 0) * 1000 / b.fromPrice.total - (a.guestRating ?? 0) * 1000 / a.fromPrice.total,
      price_asc: (a, b) => a.fromPrice.total - b.fromPrice.total,
      price_desc: (a, b) => b.fromPrice.total - a.fromPrice.total,
      rating: (a, b) => (b.guestRating ?? 0) - (a.guestRating ?? 0),
    };
    return filtered.sort(sorters[sort]);
  }, [hotels, maxPrice, stars, selectedAmenities, selectedCategories, minRating, sort]);

  const toggle = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const reset = () => { setMaxPrice(bounds.max); setStars([]); setSelectedAmenities([]); setSelectedCategories([]); setMinRating(0); };
  const cb = (checked: boolean, onChange: () => void, label: React.ReactNode, key: string) => (
    <label key={key} className="flex items-center gap-2 py-1 text-sm text-ink-soft"><input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-brand-600" />{label}</label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6 rounded-xl border border-line bg-white p-4 lg:self-start" aria-label="Filters">
        <div className="flex items-center justify-between"><p className="font-semibold">Filters</p><button onClick={reset} className="text-sm text-brand-600 hover:underline">Reset</button></div>
        <div>
          <p className="text-sm font-medium">Price range (total stay)</p>
          <input type="range" min={bounds.min} max={bounds.max} step={100} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-2 w-full accent-brand-600" aria-label="Maximum price" />
          <p className="text-xs text-muted">Up to {formatMoney(maxPrice)}</p>
        </div>
        <div><p className="text-sm font-medium">Star rating</p>{[5, 4, 3, 2].map((s) => cb(stars.includes(s), () => toggle(stars, s, setStars), <Stars count={s} />, `s${s}`))}</div>
        <div>
          <p className="text-sm font-medium">Guest rating</p>
          <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="mt-2 h-9 w-full rounded-lg border border-line px-2 text-sm" aria-label="Minimum guest rating">
            <option value={0}>Any</option><option value={7}>7+ Good</option><option value={8}>8+ Very good</option><option value={9}>9+ Excellent</option>
          </select>
        </div>
        <div><p className="text-sm font-medium">Property type</p>{categories.map((c) => cb(selectedCategories.includes(c), () => toggle(selectedCategories, c, setSelectedCategories), c, c))}</div>
        <div><p className="text-sm font-medium">Amenities</p>{amenities.map((a) => cb(selectedAmenities.includes(a), () => toggle(selectedAmenities, a, setSelectedAmenities), a, a))}</div>
      </aside>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">{list.length} of {hotels.length} properties</p>
          <label className="flex items-center gap-2 text-sm">Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-lg border border-line bg-white px-2">
              <option value="recommended">Recommended</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating">Guest rating</option>
            </select>
          </label>
        </div>
        <ul className="mt-3 space-y-3">
          {list.map((h) => (
            <li key={h.hotelId} className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-[180px_1fr_180px]">
              <HotelImage name={h.name} className="h-36 sm:h-full" />
              <div>
                <div className="flex items-center gap-2"><Stars count={h.starRating} /><span className="text-xs text-muted">{h.category}</span></div>
                <p className="mt-1 text-lg font-semibold text-ink">{h.name}</p>
                <p className="text-sm text-muted">{h.address}, {h.city}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {h.amenities.slice(0, 5).map((a) => <li key={a} className="rounded bg-canvas px-2 py-0.5 text-xs text-ink-soft">{a}</li>)}
                </ul>
              </div>
              <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-between">
                {h.guestRating && <span className={cn("rounded-md px-2 py-1 text-sm font-semibold text-white", h.guestRating >= 8 ? "bg-success" : "bg-brand-500")}>{h.guestRating.toFixed(1)}</span>}
                <div className="text-right">
                  <p className="text-xs text-muted">from</p>
                  <p className="text-xl font-semibold">{formatMoney(h.fromPrice.total, h.fromPrice.currency)}</p>
                  <p className="text-xs text-muted">{nights} night{nights > 1 ? "s" : ""}, incl. taxes</p>
                  <Link href={`/hotels/${encodeURIComponent(h.hotelId)}?${detailQuery}`} className={buttonClass("accent", "sm", "mt-2")}>View rooms</Link>
                </div>
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">No properties match. <button onClick={reset} className="text-brand-600 underline">Reset filters</button></li>}
        </ul>
      </div>
    </div>
  );
}
