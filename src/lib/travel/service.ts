import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIRPORTS_BY_CODE } from "./places";
import { applyMarkup, type MarkupRule } from "./markup";
import { loadMarkupRules } from "./pricing";
import { getFlightProvider, getHotelProvider } from "./registry";
import type { FlightOffer, FlightSearchRequest, HotelDetails, HotelSearchRequest, HotelStay, HotelSummary, RoomRate } from "./types";

/**
 * Travel API integration layer (PRD §12.1). Route handlers call this; it calls
 * the configured supplier, applies markup, and returns customer-safe shapes
 * (no supplier cost or margin leaves the server).
 */

export type CustomerPrice = { total: number; taxes: number; currency: string };

export type PricedFlightOffer = Omit<FlightOffer, "fare" | "fareRules"> & {
  price: CustomerPrice;
  fareRules: { notes: string[]; cancellationFee?: number; changeFee?: number };
};

export type PricedHotelSummary = Omit<HotelSummary, "fromPrice"> & { fromPrice: CustomerPrice };
export type PricedRoomRate = Omit<RoomRate, "price"> & { price: CustomerPrice };
export type PricedHotelDetails = Omit<HotelDetails, "rates" | "fromPrice"> & {
  rates: PricedRoomRate[];
  fromPrice: CustomerPrice;
};

function priceFlight(offer: FlightOffer, rules: MarkupRule[]): PricedFlightOffer {
  const outbound = offer.slices[0];
  const priced = applyMarkup(offer.fare.total.amount, rules, {
    product: "flight",
    supplier: offer.supplier,
    airlineCode: offer.validatingCarrier.code,
    destinationCountry: AIRPORTS_BY_CODE.get(outbound.to)?.countryCode,
  });
  const { fare, fareRules, ...rest } = offer;
  return {
    ...rest,
    price: { total: priced.customerAmount, taxes: fare.taxes.amount, currency: fare.total.currency },
    fareRules: {
      notes: fareRules.notes,
      cancellationFee: fareRules.cancellationFee?.amount,
      changeFee: fareRules.changeFee?.amount,
    },
  };
}

function priceAmount(amount: number, taxes: number, currency: string, rules: MarkupRule[], ctx: Parameters<typeof applyMarkup>[2]): CustomerPrice {
  return { total: applyMarkup(amount, rules, ctx).customerAmount, taxes, currency };
}

async function logSearch(supplier: string, request: unknown, resultCount: number | null, startedAt: number, error?: string) {
  if (!isSupabaseAdminConfigured()) return;
  const { error: dbError } = await createAdminClient().from("flight_search_logs").insert({
    supplier,
    request,
    result_count: resultCount,
    duration_ms: Date.now() - startedAt,
    error,
  });
  if (dbError) console.error("Failed to write search log", dbError);
}

export async function searchFlights(req: FlightSearchRequest) {
  const provider = getFlightProvider();
  const startedAt = Date.now();
  try {
    const [offers, rules] = await Promise.all([provider.search(req), loadMarkupRules()]);
    void logSearch(provider.id, req, offers.length, startedAt);
    return offers.map((o) => priceFlight(o, rules));
  } catch (err) {
    void logSearch(provider.id, req, null, startedAt, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

export async function revalidateFlight(offerId: string, expectedTotal?: number) {
  const provider = getFlightProvider();
  const [result, rules] = await Promise.all([provider.revalidate(offerId), loadMarkupRules()]);
  if (result.status === "unavailable") return result;
  const offer = priceFlight(result.offer, rules);
  const priceChanged = expectedTotal !== undefined ? Math.abs(offer.price.total - expectedTotal) >= 1 : result.priceChanged;
  return { status: "available" as const, offer, priceChanged, previousTotal: priceChanged ? expectedTotal : undefined };
}

export async function searchPlaces(query: string) {
  return getFlightProvider().searchPlaces(query);
}

export async function searchHotelDestinations(query: string) {
  return getHotelProvider().searchDestinations(query);
}

export async function searchHotels(req: HotelSearchRequest): Promise<PricedHotelSummary[]> {
  const provider = getHotelProvider();
  const [hotels, rules] = await Promise.all([provider.search(req), loadMarkupRules()]);
  return hotels.map(({ fromPrice, ...h }) => ({
    ...h,
    fromPrice: priceAmount(fromPrice.amount, 0, fromPrice.currency, rules, {
      product: "hotel", supplier: h.supplier, destinationCountry: h.countryCode, hotelStarRating: h.starRating,
    }),
  }));
}

export async function getHotelDetails(hotelId: string, req: HotelSearchRequest): Promise<PricedHotelDetails | null> {
  const provider = getHotelProvider();
  const [hotel, rules] = await Promise.all([provider.getHotel(hotelId, req), loadMarkupRules()]);
  if (!hotel) return null;
  const ctx = { product: "hotel" as const, supplier: hotel.supplier, destinationCountry: hotel.countryCode, hotelStarRating: hotel.starRating };
  const rates = hotel.rates.map(({ price, ...r }) => ({
    ...r,
    price: priceAmount(price.total.amount, price.taxes.amount, price.total.currency, rules, ctx),
  }));
  return {
    ...hotel,
    rates,
    fromPrice: rates.reduce((min, r) => (r.price.total < min.total ? r.price : min), rates[0]?.price ?? { total: 0, taxes: 0, currency: "INR" }),
  };
}

export async function recheckHotelRate(rateId: string, expectedTotal?: number) {
  const provider = getHotelProvider();
  const [result, rules] = await Promise.all([provider.recheckRate(rateId), loadMarkupRules()]);
  if (result.status === "unavailable") return result;
  const { price, ...rate } = result.rate;
  const { hotel } = result.stay;
  const priced: PricedRoomRate = {
    ...rate,
    price: priceAmount(price.total.amount, price.taxes.amount, price.total.currency, rules, {
      product: "hotel", supplier: provider.id, destinationCountry: hotel.countryCode, hotelStarRating: hotel.starRating,
    }),
  };
  const priceChanged = expectedTotal !== undefined ? Math.abs(priced.price.total - expectedTotal) >= 1 : result.priceChanged;
  return { status: "available" as const, rate: priced, stay: result.stay, priceChanged, previousTotal: priceChanged ? expectedTotal : undefined };
}

// ---------------------------------------------------------------------------
// Booking quotes — internal only: include supplier cost and margin for storage.
// ---------------------------------------------------------------------------

export type FlightQuote = {
  offer: PricedFlightOffer;
  supplierOfferId: string;
  supplierAmount: number;
  markupAmount: number;
  customerAmount: number;
  currency: string;
};

export async function quoteFlight(offerId: string): Promise<{ ok: true; quote: FlightQuote } | { ok: false; reason: string }> {
  const provider = getFlightProvider();
  const [result, rules] = await Promise.all([provider.revalidate(offerId), loadMarkupRules()]);
  if (result.status === "unavailable") return { ok: false, reason: result.reason };
  const offer = result.offer;
  const priced = applyMarkup(offer.fare.total.amount, rules, {
    product: "flight",
    supplier: offer.supplier,
    airlineCode: offer.validatingCarrier.code,
    destinationCountry: AIRPORTS_BY_CODE.get(offer.slices[0].to)?.countryCode,
  });
  return {
    ok: true,
    quote: {
      offer: priceFlight(offer, rules),
      supplierOfferId: offer.offerId,
      supplierAmount: priced.supplierAmount,
      markupAmount: priced.markupAmount - priced.discountAmount,
      customerAmount: priced.customerAmount,
      currency: offer.fare.total.currency,
    },
  };
}

export type HotelQuote = {
  rate: PricedRoomRate;
  stay: HotelStay;
  supplierRateId: string;
  supplierAmount: number;
  markupAmount: number;
  customerAmount: number;
  currency: string;
};

export async function quoteHotel(rateId: string): Promise<{ ok: true; quote: HotelQuote } | { ok: false; reason: string }> {
  const provider = getHotelProvider();
  const [result, rules] = await Promise.all([provider.recheckRate(rateId), loadMarkupRules()]);
  if (result.status === "unavailable") return { ok: false, reason: result.reason };
  const { price, ...rate } = result.rate;
  const priced = applyMarkup(price.total.amount, rules, {
    product: "hotel",
    supplier: provider.id,
    destinationCountry: result.stay.hotel.countryCode,
    hotelStarRating: result.stay.hotel.starRating,
  });
  return {
    ok: true,
    quote: {
      rate: { ...rate, price: { total: priced.customerAmount, taxes: price.taxes.amount, currency: price.total.currency } },
      stay: result.stay,
      supplierRateId: result.rate.rateId,
      supplierAmount: priced.supplierAmount,
      markupAmount: priced.markupAmount - priced.discountAmount,
      customerAmount: priced.customerAmount,
      currency: price.total.currency,
    },
  };
}
