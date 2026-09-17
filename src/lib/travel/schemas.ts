import { z } from "zod";

const iata = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter airport code");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const flightSearchSchema = z
  .object({
    tripType: z.enum(["one_way", "round_trip", "multi_city"]),
    legs: z.array(z.object({ from: iata, to: iata, date: isoDate })).min(1).max(5),
    passengers: z.object({
      adults: z.coerce.number().int().min(1).max(9),
      children: z.coerce.number().int().min(0).max(8).default(0),
      infants: z.coerce.number().int().min(0).max(4).default(0),
    }),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
  })
  .superRefine((v, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (v.passengers.infants > v.passengers.adults) {
      ctx.addIssue({ code: "custom", path: ["passengers", "infants"], message: "Each infant needs an accompanying adult" });
    }
    if (v.passengers.adults + v.passengers.children > 9) {
      ctx.addIssue({ code: "custom", path: ["passengers"], message: "Maximum 9 seated passengers per booking" });
    }
    if (v.tripType === "one_way" && v.legs.length !== 1) ctx.addIssue({ code: "custom", path: ["legs"], message: "One-way trips have one leg" });
    if (v.tripType === "round_trip" && v.legs.length !== 2) ctx.addIssue({ code: "custom", path: ["legs"], message: "Round trips have two legs" });
    if (v.tripType === "multi_city" && v.legs.length < 2) ctx.addIssue({ code: "custom", path: ["legs"], message: "Multi-city trips need at least two flights" });
    v.legs.forEach((leg, i) => {
      if (leg.from === leg.to) ctx.addIssue({ code: "custom", path: ["legs", i, "to"], message: "Origin and destination must differ" });
      if (leg.date < today) ctx.addIssue({ code: "custom", path: ["legs", i, "date"], message: "Date is in the past" });
      if (i > 0 && leg.date < v.legs[i - 1].date) ctx.addIssue({ code: "custom", path: ["legs", i, "date"], message: "Dates must be in order" });
    });
  });

export const hotelSearchSchema = z
  .object({
    destination: z.string().trim().min(2).max(80),
    checkIn: isoDate,
    checkOut: isoDate,
    rooms: z
      .array(
        z.object({
          adults: z.coerce.number().int().min(1).max(6),
          children: z.coerce.number().int().min(0).max(4).default(0),
          childAges: z.array(z.coerce.number().int().min(0).max(17)).optional(),
        }),
      )
      .min(1)
      .max(6),
    starRatings: z.array(z.coerce.number().int().min(1).max(5)).optional(),
  })
  .superRefine((v, ctx) => {
    const today = new Date().toISOString().slice(0, 10);
    if (v.checkIn < today) ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Check-in is in the past" });
    if (v.checkOut <= v.checkIn) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in" });
    const nights = (new Date(v.checkOut).getTime() - new Date(v.checkIn).getTime()) / 86_400_000;
    if (nights > 30) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Maximum stay is 30 nights" });
  });

export const offerTokenSchema = z.object({ offerId: z.string().min(8).max(4000) });
export const rateTokenSchema = z.object({ rateId: z.string().min(8).max(4000) });

/** Multi-city legs are encoded as repeated `leg=FROM_TO_YYYY-MM-DD` params. */
export const encodeLeg = (leg: { from: string; to: string; date: string }) => `${leg.from}_${leg.to}_${leg.date}`;

export function decodeLegs(params: Record<string, string | string[] | undefined>) {
  const raw = params.leg;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.slice(0, 5).map((l) => {
    const [from = "", to = "", date = ""] = l.split("_");
    return { from, to, date };
  });
}

/** Parses flight search from URL query params (shareable result URLs). */
export function flightSearchFromParams(params: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) as string | undefined;
  const tripType = get("trip") ?? "one_way";
  const from = get("from") ?? "";
  const to = get("to") ?? "";
  let legs = [{ from, to, date: get("depart") ?? "" }];
  if (tripType === "round_trip") legs.push({ from: to, to: from, date: get("return") ?? "" });
  if (tripType === "multi_city") legs = decodeLegs(params);
  return flightSearchSchema.safeParse({
    tripType,
    legs,
    passengers: { adults: get("adults") ?? 1, children: get("children") ?? 0, infants: get("infants") ?? 0 },
    cabin: get("cabin") ?? "economy",
  });
}

export function hotelSearchFromParams(params: Record<string, string | string[] | undefined>) {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]?.[0] : params[k]) as string | undefined;
  const roomCount = Math.min(Math.max(Number(get("rooms") ?? 1), 1), 6);
  const adults = Number(get("adults") ?? 2);
  const children = Number(get("children") ?? 0);
  // Spread guests across rooms as evenly as possible.
  const rooms = Array.from({ length: roomCount }, (_, i) => ({
    adults: Math.max(1, Math.floor(adults / roomCount) + (i < adults % roomCount ? 1 : 0)),
    children: Math.floor(children / roomCount) + (i < children % roomCount ? 1 : 0),
  }));
  return hotelSearchSchema.safeParse({
    destination: get("destination") ?? "",
    checkIn: get("checkin") ?? "",
    checkOut: get("checkout") ?? "",
    rooms,
  });
}
