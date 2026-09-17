import { HOTEL_DESTINATIONS, matchPlaces } from "../places";
import type {
  HotelDetails,
  HotelProvider,
  HotelSearchRequest,
  HotelSummary,
  MealPlan,
  Money,
  RateRecheckResult,
  RoomRate,
} from "../types";
import { decodeToken, encodeToken, hashString, randomRef, roundTo, seededRandom } from "./mock-utils";

/** Sandbox hotel supplier — see mock-flight.ts for rationale. */

const NAME_PARTS = {
  prefix: ["The", "Grand", "Royal", "Park", "City", "Harbour", "Maple", "Summit", "Riverside", "Central"],
  core: ["Plaza", "Residency", "Suites", "Inn", "Palace", "Tower", "Lodge", "House", "Heritage", "Continental"],
};
const AMENITIES = ["Free Wi-Fi", "Breakfast available", "Airport shuttle", "Pool", "Gym", "Parking", "Spa", "Restaurant", "24h front desk", "Kitchenette", "Laundry", "Pet friendly"];
const ROOMS = ["Standard Room", "Deluxe Room", "Superior King", "Executive Suite", "Family Room"];
const MEALS: MealPlan[] = ["room_only", "breakfast", "half_board"];
const CATEGORIES = ["Hotel", "Apartment", "Resort", "Boutique", "Business"];

const inr = (amount: number): Money => ({ amount: roundTo(amount), currency: "INR" });

type RateToken = { v: 1; hotelId: string; req: HotelSearchRequest; r: number };

function nights(req: HotelSearchRequest) {
  const ms = new Date(req.checkOut).getTime() - new Date(req.checkIn).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function buildHotel(destination: string, index: number): Omit<HotelSummary, "fromPrice"> & { nightly: number; description: string } {
  const place = HOTEL_DESTINATIONS.find((d) => d.code === destination);
  const rand = seededRandom(`hotel:${destination}:${index}`);
  const star = 2 + Math.floor(rand() * 4);
  const name = `${NAME_PARTS.prefix[Math.floor(rand() * 10)]} ${place?.city ?? "City"} ${NAME_PARTS.core[Math.floor(rand() * 10)]}`;
  const amenities = AMENITIES.filter(() => rand() < 0.5);
  const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
  return {
    hotelId: `mock-${destination}-${index}`,
    supplier: "mock",
    name,
    starRating: star,
    address: `${10 + Math.floor(rand() * 400)} ${["King", "Queen", "Main", "Park", "Station"][Math.floor(rand() * 5)]} Street`,
    city: place?.city ?? destination,
    countryCode: place?.countryCode ?? "",
    images: [],
    amenities: amenities.length ? amenities : ["Free Wi-Fi"],
    guestRating: Math.round((6.5 + rand() * 3.3) * 10) / 10,
    category,
    nightly: 2200 + star * star * 900 * (0.7 + rand() * 0.8),
    description: `A ${star}-star ${category.toLowerCase()} in ${place?.city ?? "the city"}, close to transit and local attractions.`,
  };
}

function buildRates(hotelId: string, req: HotelSearchRequest): RoomRate[] {
  const [, destination, idx] = hotelId.match(/^mock-(.+)-(\d+)$/) ?? [];
  if (!destination) return [];
  const hotel = buildHotel(destination, Number(idx));
  const rand = seededRandom(`rates:${hotelId}:${JSON.stringify(req)}`);
  const n = nights(req);
  const roomCount = req.rooms.length;
  const count = 2 + Math.floor(rand() * 3);

  return Array.from({ length: count }, (_, r) => {
    const meal = MEALS[r % MEALS.length];
    const refundable = r % 2 === 0;
    const base = hotel.nightly * (1 + r * 0.22) * (refundable ? 1.08 : 1) * n * roomCount;
    const taxes = base * 0.12;
    const freeUntil = new Date(new Date(req.checkIn).getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
    const token: RateToken = { v: 1, hotelId, req, r };
    return {
      rateId: encodeToken(token),
      roomName: ROOMS[Math.min(r + (hotel.starRating > 3 ? 1 : 0), ROOMS.length - 1)],
      mealPlan: meal,
      refundable,
      freeCancellationUntil: refundable ? freeUntil : undefined,
      cancellationPolicy: refundable
        ? `Free cancellation until ${freeUntil}. After that, the first night is charged.`
        : "Non-refundable. No refund on cancellation or no-show.",
      price: { base: inr(base), taxes: inr(taxes), total: inr(base + taxes) },
    };
  });
}

export class MockHotelProvider implements HotelProvider {
  readonly id = "mock";

  async searchDestinations(query: string) {
    return matchPlaces(HOTEL_DESTINATIONS, query);
  }

  async search(req: HotelSearchRequest): Promise<HotelSummary[]> {
    const count = 12 + (hashString(req.destination) % 9);
    return Array.from({ length: count }, (_, i) => {
      const { nightly: _n, description: _d, ...hotel } = buildHotel(req.destination, i);
      const cheapest = Math.min(...buildRates(hotel.hotelId, req).map((r) => r.price.total.amount));
      return { ...hotel, fromPrice: inr(cheapest) };
    }).filter((h) => !req.starRatings?.length || req.starRatings.includes(h.starRating));
  }

  async getHotel(hotelId: string, req: HotelSearchRequest): Promise<HotelDetails | null> {
    const [, destination, idx] = hotelId.match(/^mock-(.+)-(\d+)$/) ?? [];
    if (!destination) return null;
    const { nightly: _n, description, ...hotel } = buildHotel(destination, Number(idx));
    const rates = buildRates(hotelId, req);
    return {
      ...hotel,
      description,
      policies: ["Check-in from 14:00, check-out until 11:00", "Government-issued photo ID required at check-in"],
      rates,
      fromPrice: inr(Math.min(...rates.map((r) => r.price.total.amount))),
    };
  }

  async recheckRate(rateId: string): Promise<RateRecheckResult> {
    const token = decodeToken<RateToken>(rateId);
    if (!token || token.v !== 1) return { status: "unavailable", reason: "This rate is no longer available." };
    if (token.req.checkIn < new Date().toISOString().slice(0, 10)) {
      return { status: "unavailable", reason: "Check-in date has passed." };
    }
    const rate = buildRates(token.hotelId, token.req)[token.r];
    const [, destination, idx] = token.hotelId.match(/^mock-(.+)-(\d+)$/) ?? [];
    if (!rate || !destination) return { status: "unavailable", reason: "This room is sold out." };
    const h = buildHotel(destination, Number(idx));
    return {
      status: "available",
      rate,
      stay: {
        hotel: { hotelId: h.hotelId, name: h.name, starRating: h.starRating, address: h.address, city: h.city, countryCode: h.countryCode },
        checkIn: token.req.checkIn,
        checkOut: token.req.checkOut,
        rooms: token.req.rooms,
      },
      priceChanged: false,
    };
  }

  async book() {
    return { supplierBookingRef: randomRef("MKH-", 8), confirmationNumber: randomRef("HC", 8), status: "confirmed" as const };
  }

  async quoteCancellation() {
    return {
      eligible: true,
      cancellationFee: inr(0),
      refundAmount: inr(0),
      notes: ["Sandbox supplier: live supplier returns the actual fee and refund."],
    };
  }

  async cancel(supplierBookingRef: string) {
    return { status: "cancelled" as const, refundAmount: inr(0), supplierReference: `CX-${supplierBookingRef}` };
  }
}
