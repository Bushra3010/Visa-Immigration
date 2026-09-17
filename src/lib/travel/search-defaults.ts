import { AIRPORTS_BY_CODE, HOTEL_DESTINATIONS } from "./places";
import { decodeLegs } from "./schemas";
import type { TravelSearchDefaults } from "@/components/travel/travel-search";

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params, k: string) => (Array.isArray(p[k]) ? p[k]?.[0] : p[k]) as string | undefined;
const num = (p: Params, k: string) => (one(p, k) ? Number(one(p, k)) : undefined);

/** Pre-fills the search widget from URL params on results pages. */
export function searchDefaultsFromParams(p: Params): TravelSearchDefaults {
  return {
    trip: (["one_way", "round_trip", "multi_city"] as const).find((t) => t === one(p, "trip")),
    legs: one(p, "trip") === "multi_city"
      ? decodeLegs(p).map((l) => ({ from: AIRPORTS_BY_CODE.get(l.from) ?? null, to: AIRPORTS_BY_CODE.get(l.to) ?? null, date: l.date }))
      : undefined,
    from: AIRPORTS_BY_CODE.get(one(p, "from") ?? "") ?? null,
    to: AIRPORTS_BY_CODE.get(one(p, "to") ?? "") ?? null,
    depart: one(p, "depart"),
    return: one(p, "return"),
    adults: num(p, "adults"),
    children: num(p, "children"),
    infants: num(p, "infants"),
    cabin: one(p, "cabin"),
    destination: HOTEL_DESTINATIONS.find((d) => d.code === one(p, "destination")) ?? null,
    checkin: one(p, "checkin"),
    checkout: one(p, "checkout"),
    rooms: num(p, "rooms"),
  };
}
