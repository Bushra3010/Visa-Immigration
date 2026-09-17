"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeftRight, ArrowUpDown, Hotel, Luggage, Plane, Plus, Search, UserRound, X, type LucideIcon } from "lucide-react";
import { AIRPORTS_BY_CODE, HOTEL_DESTINATIONS } from "@/lib/travel/places";
import { encodeLeg } from "@/lib/travel/schemas";
import type { CabinClass, Place } from "@/lib/travel/types";
import { cn, todayPlus } from "@/lib/utils";
import { Counter, DateField, PlaceField, PopoverField } from "./search-fields";

/** Travel booking widget — Flights, Hotels and Flight + Hotel (PRD §5.2, §7.1–7.3). */
export type TravelTab = "flights" | "hotels" | "package";
type TripType = "one_way" | "round_trip" | "multi_city";
type Leg = { from: Place | null; to: Place | null; date: string };

export type TravelSearchDefaults = {
  trip?: TripType;
  from?: Place | null;
  to?: Place | null;
  depart?: string;
  return?: string;
  legs?: Leg[];
  adults?: number;
  children?: number;
  infants?: number;
  cabin?: string;
  destination?: Place | null;
  checkin?: string;
  checkout?: string;
  rooms?: number;
};

const TABS: { id: TravelTab; label: string; icon: LucideIcon; headline: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, headline: "Book International and Domestic Flights" },
  { id: "hotels", label: "Hotels", icon: Hotel, headline: "Book Domestic and International Hotels" },
  { id: "package", label: "Flight + Hotel", icon: Luggage, headline: "Book your flight and hotel together under one booking" },
];

const TRIP_TYPES: [TripType, string][] = [["one_way", "One Way"], ["round_trip", "Round Trip"], ["multi_city", "Multi City"]];

const CABINS: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const MAX_LEGS = 5;
const cityPlace = (code: string) => HOTEL_DESTINATIONS.find((d) => d.code === code) ?? null;
const addDays = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export function TravelSearch({ initialTab = "flights", defaults = {}, tabs = true, className, carryParams }: {
  initialTab?: TravelTab; defaults?: TravelSearchDefaults; tabs?: boolean; className?: string;
  /** Extra params preserved across searches, e.g. the linked visa application. */
  carryParams?: Record<string, string>;
}) {
  const router = useRouter();
  const today = todayPlus(0);
  const [tab, setTab] = useState<TravelTab>(initialTab);
  const [error, setError] = useState<string | null>(null);

  // Flights & Flight + Hotel
  // In multi-city mode the first leg lives in from/to/depart; the rest in extraLegs.
  const firstLeg = defaults.legs?.[0];
  const [trip, setTrip] = useState<TripType>(defaults.trip ?? "one_way");
  const [from, setFrom] = useState<Place | null>(firstLeg?.from ?? defaults.from ?? AIRPORTS_BY_CODE.get("DEL") ?? null);
  const [to, setTo] = useState<Place | null>(firstLeg?.to ?? defaults.to ?? AIRPORTS_BY_CODE.get("BLR") ?? null);
  const [depart, setDepart] = useState(firstLeg?.date ?? defaults.depart ?? todayPlus(1));
  const [ret, setRet] = useState<string | null>(defaults.return ?? null);
  const [extraLegs, setExtraLegs] = useState<Leg[]>(() => defaults.legs?.slice(1) ?? []);
  const [adults, setAdults] = useState(defaults.adults ?? 1);
  const [children, setChildren] = useState(defaults.children ?? 0);
  const [infants, setInfants] = useState(defaults.infants ?? 0);
  const [cabin, setCabin] = useState<CabinClass>((defaults.cabin as CabinClass) ?? "economy");

  // Hotels
  const [destination, setDestination] = useState<Place | null>(defaults.destination ?? cityPlace("bengaluru"));
  const [checkin, setCheckin] = useState(defaults.checkin ?? todayPlus(1));
  const [checkout, setCheckout] = useState(defaults.checkout ?? todayPlus(2));
  const [rooms, setRooms] = useState(defaults.rooms ?? 1);
  const [hotelAdults, setHotelAdults] = useState(defaults.adults ?? 2);
  const [hotelChildren, setHotelChildren] = useState(defaults.children ?? 0);

  const active = TABS.find((t) => t.id === tab)!;
  const multi = tab === "flights" && trip === "multi_city";

  function chooseTrip(value: TripType) {
    setTrip(value);
    if (value === "round_trip" && !ret) setRet(addDays(depart, 7));
    if (value === "multi_city" && extraLegs.length === 0) setExtraLegs([{ from: to, to: null, date: addDays(depart, 3) }]);
  }

  const updateLeg = (i: number, patch: Partial<Leg>) => setExtraLegs((legs) => legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLeg = () =>
    setExtraLegs((legs) => {
      const last = legs[legs.length - 1] ?? { to, date: depart };
      return [...legs, { from: last.to, to: null, date: addDays(last.date, 3) }];
    });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const params = new URLSearchParams(carryParams);

    if (tab === "flights" || tab === "package") {
      if (!from || !to) return setError("Choose where you're flying from and to.");
      if (from.code === to.code) return setError("Departure and destination must be different.");
      params.set("adults", String(adults));

      if (multi) {
        const legs = [{ from, to, date: depart }, ...extraLegs];
        for (const [i, leg] of legs.entries()) {
          if (!leg.from || !leg.to) return setError(`Choose both cities for flight ${i + 1}.`);
          if (leg.from.code === leg.to.code) return setError(`Flight ${i + 1}: departure and destination must be different.`);
          if (i > 0 && leg.date < legs[i - 1].date) return setError(`Flight ${i + 1} must depart on or after flight ${i}.`);
        }
        params.set("trip", "multi_city");
        legs.forEach((l) => params.append("leg", encodeLeg({ from: l.from!.code, to: l.to!.code, date: l.date })));
      } else {
        const round = tab === "package" || trip === "round_trip";
        if (round && !ret) return setError("Add a return date.");
        if (round && ret! < depart) return setError("Return date must be after departure.");
        params.set("from", from.code);
        params.set("to", to.code);
        params.set("depart", depart);
        if (round) params.set("return", ret!);
        if (tab === "flights") params.set("trip", round ? "round_trip" : "one_way");
      }

      if (tab === "flights") {
        params.set("children", String(children));
        params.set("infants", String(infants));
        params.set("cabin", cabin);
        return router.push(`/flights?${params}`);
      }
      params.set("rooms", String(rooms));
      return router.push(`/flight-hotel?${params}`);
    }

    if (!destination) return setError("Choose a destination.");
    if (checkout <= checkin) return setError("Check-out must be after check-in.");
    params.set("destination", destination.code);
    params.set("checkin", checkin);
    params.set("checkout", checkout);
    params.set("rooms", String(rooms));
    params.set("adults", String(Math.max(hotelAdults, rooms)));
    params.set("children", String(hotelChildren));
    router.push(`/hotels?${params}`);
  }

  const travellers = adults + children + infants;
  const fieldGrid = "relative grid rounded-xl border border-line divide-y divide-line md:divide-y-0 md:divide-x";
  const flightCols = "md:grid-cols-[1.35fr_1.25fr_0.8fr_0.8fr_0.9fr_1.1fr]";

  const travellersField = (
    <PopoverField
      label={tab === "flights" ? "Travellers" : "Travellers & Rooms"}
      display={travellers}
      sub={tab === "flights" ? (travellers === 1 ? "Adult" : "Travellers") : `${rooms} Room${rooms > 1 ? "s" : ""}`}
    >
      <Counter label="Adults" hint="12 yrs or above" value={adults} min={1} max={9 - children} onChange={(v) => { setAdults(v); if (infants > v) setInfants(v); if (rooms > v) setRooms(v); }} />
      {tab === "flights" && (
        <>
          <Counter label="Children" hint="2 – 12 yrs" value={children} min={0} max={9 - adults} onChange={setChildren} />
          <Counter label="Infants" hint="Under 2 yrs" value={infants} min={0} max={adults} onChange={setInfants} />
        </>
      )}
      {tab === "package" && <Counter label="Rooms" value={rooms} min={1} max={Math.min(4, adults)} onChange={setRooms} />}
    </PopoverField>
  );

  const cabinField = (
    <PopoverField label="Cabin Class" display={CABINS.find((c) => c.value === cabin)?.label} popoverClassName="right-0 left-auto w-64">
      <ul role="listbox" aria-label="Cabin class">
        {CABINS.map((c) => (
          <li key={c.value}>
            <button type="button" role="option" aria-selected={cabin === c.value} onClick={() => setCabin(c.value)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm", cabin === c.value ? "bg-accent-50 font-semibold text-accent-600" : "hover:bg-canvas")}>
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </PopoverField>
  );

  const travellerSummary =
    tab === "package"
      ? `${adults} Traveller${adults > 1 ? "s" : ""}, ${rooms} Room${rooms > 1 ? "s" : ""}`
      : `${travellers} Traveller${travellers > 1 ? "s" : ""}, ${CABINS.find((c) => c.value === cabin)?.label}`;

  // Phone layout: travellers + cabin share one field, as in the mobile design.
  const mobileTravellers = (align: "left" | "right") => (
    <PopoverField
      compact
      label="Travellers"
      display={travellerSummary}
      trailing={<UserRound className="size-5 shrink-0 text-ink-soft" strokeWidth={1.6} />}
      popoverClassName={align === "right" ? "left-auto right-0" : undefined}
    >
      <Counter label="Adults" hint="12 yrs or above" value={adults} min={1} max={9 - children} onChange={(v) => { setAdults(v); if (infants > v) setInfants(v); if (rooms > v) setRooms(v); }} />
      {tab === "flights" && (
        <>
          <Counter label="Children" hint="2 – 12 yrs" value={children} min={0} max={9 - adults} onChange={setChildren} />
          <Counter label="Infants" hint="Under 2 yrs" value={infants} min={0} max={adults} onChange={setInfants} />
          <p className="mt-2 text-sm font-semibold text-ink">Cabin class</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {CABINS.map((c) => (
              <button key={c.value} type="button" aria-pressed={cabin === c.value} onClick={() => setCabin(c.value)} className={cn("rounded-lg border px-2 py-2 text-xs", cabin === c.value ? "border-brand-600 bg-brand-50 font-semibold text-brand-700" : "border-line")}>
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}
      {tab === "package" && <Counter label="Rooms" value={rooms} min={1} max={Math.min(4, adults)} onChange={setRooms} />}
    </PopoverField>
  );

  const mobileRoute = (
    <div className="relative grid grid-cols-2 gap-3">
      <PlaceField compact label="From" name="from" type="airport" value={from} onChange={setFrom} />
      <PlaceField compact label="To" name="to" type="airport" value={to} onChange={setTo} align="right" className="[&>button]:pl-7" />
      <button
        type="button"
        onClick={() => { setFrom(to); setTo(from); }}
        aria-label="Swap origin and destination"
        className="absolute left-1/2 top-1/2 z-10 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-sm"
      >
        <ArrowLeftRight className="size-[18px]" />
      </button>
    </div>
  );

  const searchLabel = tab === "flights" ? "Search Flights" : tab === "hotels" ? "Search Hotels" : "Search Flight + Hotel";

  return (
    <div className={cn("relative rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,27,45,0.12)] md:mb-7 shadow-[0_4px_24px_rgba(15,27,45,0.12)]", className)}>
      {tabs && (
        <div role="tablist" aria-label="Book travel" className="flex overflow-x-auto border-b border-line px-2 pt-1 sm:px-4 md:pt-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={selected}
                onClick={() => { setTab(id); setError(null); }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2 px-2 py-4 text-center text-[15px] leading-[1.3] md:min-w-[112px] md:flex-none md:flex-col md:px-4 md:pb-4 md:pt-3 md:text-[14px]",
                  selected ? "font-semibold text-brand-600" : "text-ink hover:text-brand-600",
                )}
              >
                <Icon className="size-6 md:size-7" strokeWidth={1.4} />
                <span className="whitespace-nowrap">{label}</span>
                {selected && <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className="px-4 pb-5 pt-4 sm:px-5 md:pb-12" noValidate>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {tab === "flights" ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] md:gap-6 md:text-[15px]" role="radiogroup" aria-label="Trip type">
              {TRIP_TYPES.map(([value, label], i) => (
                <label key={value} className={cn("flex cursor-pointer items-center gap-2", i > 0 && "border-l border-line pl-3 md:border-0 md:pl-0", trip === value ? "font-medium text-ink md:font-semibold" : "text-ink-soft")}>
                  <input type="radio" name="trip" checked={trip === value} onChange={() => chooseTrip(value)} className="size-4 accent-brand-600 md:accent-accent-500" />
                  {label}
                </label>
              ))}
            </div>
          ) : <span />}
          <p className="hidden text-[15px] text-ink-soft md:block">{active.headline}</p>
        </div>

        {/* Phone layout */}
        <div className="space-y-3 md:hidden">
          {(tab === "flights" || tab === "package") && (
            <>
              {mobileRoute}
              {tab === "flights" && trip === "one_way" && (
                <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
                  <DateField compact label="Depart on" name="depart" value={depart} min={today} onChange={(v) => { setDepart(v); if (ret && ret < v) setRet(v); }} />
                  {mobileTravellers("right")}
                </div>
              )}
              {(tab === "package" || trip === "round_trip") && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <DateField compact label="Depart on" name="depart" value={depart} min={today} onChange={(v) => { setDepart(v); if (ret && ret < v) setRet(v); }} />
                    <DateField compact label="Return on" name="return" value={ret} min={depart} onChange={setRet} />
                  </div>
                  {mobileTravellers("left")}
                </>
              )}
              {multi && (
                <>
                  <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
                    <DateField compact label="Depart on" name="depart" value={depart} min={today} onChange={(v) => setDepart(v)} />
                    {mobileTravellers("right")}
                  </div>
                  {extraLegs.map((leg, i) => (
                    <fieldset key={i} className="space-y-3 border-t border-dashed border-line pt-3">
                      <legend className="sr-only">Flight {i + 2}</legend>
                      <div className="flex items-center justify-between text-[13px] font-semibold text-ink-soft">
                        <span className="flex items-center gap-1.5"><ArrowUpDown className="size-4" /> Flight {i + 2}</span>
                        {extraLegs.length > 1 && (
                          <button type="button" onClick={() => setExtraLegs((legs) => legs.filter((_, idx) => idx !== i))} aria-label={`Remove flight ${i + 2}`} className="grid size-8 place-items-center rounded-full text-muted">
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <PlaceField compact label="From" name={`m-from${i + 2}`} type="airport" value={leg.from} onChange={(p) => updateLeg(i, { from: p })} />
                        <PlaceField compact label="To" name={`m-to${i + 2}`} type="airport" value={leg.to} onChange={(p) => updateLeg(i, { to: p })} align="right" />
                      </div>
                      <DateField compact label="Depart on" name={`m-depart${i + 2}`} value={leg.date} min={i === 0 ? depart : extraLegs[i - 1].date} onChange={(v) => updateLeg(i, { date: v })} />
                    </fieldset>
                  ))}
                  {extraLegs.length + 1 < MAX_LEGS && (
                    <button type="button" onClick={addLeg} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-600 py-3 text-sm font-semibold text-brand-600">
                      <Plus className="size-4" /> Add another city
                    </button>
                  )}
                </>
              )}
            </>
          )}
          {tab === "hotels" && (
            <>
              <PlaceField compact label="Destination" name="destination" type="hotel" value={destination} onChange={setDestination} />
              <div className="grid grid-cols-2 gap-3">
                <DateField compact label="Check-in" name="checkin" value={checkin} min={today} onChange={(v) => { setCheckin(v); if (checkout <= v) setCheckout(addDays(v, 1)); }} />
                <DateField compact label="Check-out" name="checkout" value={checkout} min={addDays(checkin, 1)} onChange={setCheckout} />
              </div>
              <PopoverField
                compact
                label="Rooms & Guests"
                display={`${rooms} Room${rooms > 1 ? "s" : ""}, ${hotelAdults + hotelChildren} Guest${hotelAdults + hotelChildren > 1 ? "s" : ""}`}
                trailing={<UserRound className="size-5 shrink-0 text-ink-soft" strokeWidth={1.6} />}
              >
                <Counter label="Rooms" value={rooms} min={1} max={6} onChange={(v) => { setRooms(v); if (hotelAdults < v) setHotelAdults(v); }} />
                <Counter label="Adults" value={hotelAdults} min={rooms} max={rooms * 6} onChange={setHotelAdults} />
                <Counter label="Children" hint="0 – 17 yrs" value={hotelChildren} min={0} max={rooms * 4} onChange={setHotelChildren} />
              </PopoverField>
            </>
          )}
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <button type="submit" className="flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-brand-600 text-[16px] font-semibold text-white hover:bg-brand-700">
            <Search className="size-5" strokeWidth={2} /> {searchLabel}
          </button>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block">

        {(tab === "flights" || tab === "package") && (
          <div className="space-y-3">
            <div className={cn(fieldGrid, tab === "flights" ? flightCols : "md:grid-cols-[1.35fr_1.25fr_0.9fr_0.9fr_1.1fr]")}>
              <PlaceField label="From" name="from" type="airport" value={from} onChange={setFrom} />
              <button
                type="button"
                onClick={() => { setFrom(to); setTo(from); }}
                aria-label="Swap origin and destination"
                className="absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink-soft shadow-md hover:text-accent-500 md:grid"
                style={{ left: `calc((100% * 1.35 / ${tab === "flights" ? 6.2 : 5.5}) - 22px)` }}
              >
                <ArrowLeftRight className="size-5" />
              </button>
              <PlaceField label="To" name="to" type="airport" value={to} onChange={setTo} className="md:pl-4" />
              <DateField label="Departure" name="depart" value={depart} min={today} onChange={(v) => { setDepart(v); if (ret && ret < v) setRet(v); }} />
              {multi ? (
                <div aria-hidden className="hidden md:block" />
              ) : (
                <DateField
                  label="Return"
                  name="return"
                  value={tab === "package" || trip === "round_trip" ? ret : null}
                  min={depart}
                  placeholder="Tap to add a return date"
                  onEmptyClick={() => { if (tab === "flights" && trip !== "round_trip") chooseTrip("round_trip"); if (!ret) setRet(addDays(depart, 7)); }}
                  onChange={setRet}
                />
              )}
              {travellersField}
              {tab === "flights" && cabinField}
            </div>

            {multi && extraLegs.map((leg, i) => (
              <div key={i} className={cn(fieldGrid, flightCols)}>
                <PlaceField label={`From (flight ${i + 2})`} name={`from${i + 2}`} type="airport" value={leg.from} onChange={(p) => updateLeg(i, { from: p })} />
                <PlaceField label="To" name={`to${i + 2}`} type="airport" value={leg.to} onChange={(p) => updateLeg(i, { to: p })} />
                <DateField label="Departure" name={`depart${i + 2}`} value={leg.date} min={i === 0 ? depart : extraLegs[i - 1].date} onChange={(v) => updateLeg(i, { date: v })} />
                <div className="flex items-center gap-3 px-4 py-3 md:col-span-3 md:border-l-0">
                  {i === extraLegs.length - 1 && extraLegs.length + 1 < MAX_LEGS && (
                    <button type="button" onClick={addLeg} className="flex items-center gap-2 rounded-lg border border-accent-500 px-4 py-2 text-sm font-semibold text-accent-500 hover:bg-accent-50">
                      <Plus className="size-4" /> Add another city
                    </button>
                  )}
                  {extraLegs.length > 1 && (
                    <button type="button" onClick={() => setExtraLegs((legs) => legs.filter((_, idx) => idx !== i))} aria-label={`Remove flight ${i + 2}`} className="ml-auto grid size-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-danger">
                      <X className="size-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "hotels" && (
          <div className={cn(fieldGrid, "md:grid-cols-[1.6fr_1fr_1fr_1.2fr]")}>
            <PlaceField label="Destination" name="destination" type="hotel" value={destination} onChange={setDestination} />
            <DateField label="Check-In" name="checkin" value={checkin} min={today} onChange={(v) => { setCheckin(v); if (checkout <= v) setCheckout(addDays(v, 1)); }} />
            <DateField label="Check-Out" name="checkout" value={checkout} min={addDays(checkin, 1)} onChange={setCheckout} />
            <PopoverField
              label="Rooms & Guests"
              display={<>{rooms} <span className="text-[18px] font-medium">Room{rooms > 1 ? "s" : ""}</span> {hotelAdults + hotelChildren} <span className="text-[18px] font-medium">Guests</span></>}
              sub={`${hotelAdults} Adults${hotelChildren ? `, ${hotelChildren} Children` : ""}`}
              popoverClassName="right-0 left-auto"
            >
              <Counter label="Rooms" value={rooms} min={1} max={6} onChange={(v) => { setRooms(v); if (hotelAdults < v) setHotelAdults(v); }} />
              <Counter label="Adults" value={hotelAdults} min={rooms} max={rooms * 6} onChange={setHotelAdults} />
              <Counter label="Children" hint="0 – 17 yrs" value={hotelChildren} min={0} max={rooms * 4} onChange={setHotelChildren} />
            </PopoverField>
          </div>
        )}

        {error && <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p>}
        </div>

        <button
          type="submit"
          className="absolute bottom-0 left-1/2 hidden h-[40px] w-[208px] -translate-x-1/2 translate-y-1/2 rounded-lg bg-gradient-to-r from-accent-500 to-[#1a84f0] text-[18px] font-extrabold tracking-wide text-white shadow-[0_4px_12px_rgba(11,111,232,0.35)] hover:brightness-110 md:block"
        >
          SEARCH
        </button>
      </form>
    </div>
  );
}
