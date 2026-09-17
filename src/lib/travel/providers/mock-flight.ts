import { AIRPORTS, AIRPORTS_BY_CODE, matchPlaces } from "../places";
import type {
  CabinClass,
  FlightOffer,
  FlightProvider,
  FlightSearchRequest,
  FlightSegment,
  FlightSlice,
  Money,
  RevalidationResult,
} from "../types";
import { decodeToken, encodeToken, hashString, randomRef, roundTo, seededRandom } from "./mock-utils";

/**
 * Sandbox flight supplier. Produces realistic, deterministic results so the
 * booking flow can be built and tested before a commercial supplier (TBO,
 * Amadeus, Duffel, ...) is contracted in Phase 2. Never used in production.
 */

const COORDS: Record<string, [number, number]> = {
  DEL: [28.56, 77.1], BOM: [19.09, 72.87], BLR: [13.2, 77.71], HYD: [17.24, 78.43], MAA: [12.99, 80.17],
  CCU: [22.65, 88.45], ATQ: [31.71, 74.8], COK: [10.15, 76.4], AMD: [23.07, 72.63], YYZ: [43.68, -79.63],
  YVR: [49.19, -123.18], YUL: [45.47, -73.74], YYC: [51.13, -114.01], LHR: [51.47, -0.45], MAN: [53.35, -2.27],
  BHX: [52.45, -1.75], JFK: [40.64, -73.78], SFO: [37.62, -122.38], ORD: [41.97, -87.91], IAD: [38.95, -77.46],
  SYD: [-33.94, 151.18], MEL: [-37.67, 144.84], BNE: [-27.38, 153.12], PER: [-31.94, 115.97], AKL: [-37.01, 174.79],
  FRA: [50.03, 8.57], MUC: [48.35, 11.79], BER: [52.37, 13.5], CDG: [49.01, 2.55], AMS: [52.31, 4.76],
  DXB: [25.25, 55.36], AUH: [24.43, 54.65], DOH: [25.27, 51.61], SIN: [1.36, 103.99],
};

const CARRIERS = [
  { code: "AI", name: "Air India", hubs: ["DEL", "BOM"] },
  { code: "6E", name: "IndiGo", hubs: ["DEL", "BOM", "BLR"] },
  { code: "EK", name: "Emirates", hubs: ["DXB"] },
  { code: "QR", name: "Qatar Airways", hubs: ["DOH"] },
  { code: "EY", name: "Etihad Airways", hubs: ["AUH"] },
  { code: "LH", name: "Lufthansa", hubs: ["FRA", "MUC"] },
  { code: "BA", name: "British Airways", hubs: ["LHR"] },
  { code: "AC", name: "Air Canada", hubs: ["YYZ", "YVR"] },
  { code: "SQ", name: "Singapore Airlines", hubs: ["SIN"] },
  { code: "UA", name: "United Airlines", hubs: ["SFO", "ORD", "IAD"] },
];

const CABIN_MULTIPLIER: Record<CabinClass, number> = {
  economy: 1,
  premium_economy: 1.7,
  business: 3.6,
  first: 6,
};

type OfferToken = { v: 1; req: FlightSearchRequest; i: number };

function distanceKm(a: string, b: string) {
  const [lat1, lon1] = COORDS[a] ?? [0, 0];
  const [lat2, lon2] = COORDS[b] ?? [10, 10];
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const inr = (amount: number): Money => ({ amount: roundTo(amount), currency: "INR" });

function addMinutes(isoLocal: string, minutes: number) {
  const d = new Date(`${isoLocal}Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 16);
}

function buildSlice(from: string, to: string, date: string, rand: () => number): FlightSlice & { carrier: (typeof CARRIERS)[number] } {
  const direct = distanceKm(from, to);
  const domestic = AIRPORTS_BY_CODE.get(from)?.countryCode === AIRPORTS_BY_CODE.get(to)?.countryCode;
  const maxStops = domestic ? 1 : direct > 9000 ? 2 : 1;
  const stops = direct < 1500 ? (rand() < 0.8 ? 0 : 1) : Math.floor(rand() * (maxStops + 1));

  const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)];
  const hubs = [...carrier.hubs, "DXB", "DOH", "FRA", "LHR", "SIN"].filter((h) => h !== from && h !== to);
  const points = [from];
  for (let s = 0; s < stops; s++) points.push(hubs[Math.floor(rand() * hubs.length)] ?? "DXB");
  points.push(to);

  const departHour = 5 + Math.floor(rand() * 18);
  let cursor = `${date}T${String(departHour).padStart(2, "0")}:${rand() < 0.5 ? "05" : "40"}`;
  const segments: FlightSegment[] = [];
  let total = 0;
  for (let p = 0; p < points.length - 1; p++) {
    const minutes = roundTo(distanceKm(points[p], points[p + 1]) / 800 * 60 + 35, 5);
    const arrive = addMinutes(cursor, minutes);
    segments.push({
      marketingCarrier: { code: carrier.code, name: carrier.name },
      flightNumber: `${carrier.code}${100 + Math.floor(rand() * 899)}`,
      from: points[p],
      to: points[p + 1],
      departAt: cursor,
      arriveAt: arrive,
      durationMinutes: minutes,
    });
    total += minutes;
    if (p < points.length - 2) {
      const layover = roundTo(70 + rand() * 240, 5);
      total += layover;
      cursor = addMinutes(arrive, layover);
    }
  }
  return { from, to, segments, durationMinutes: total, stops, carrier };
}

function buildOffer(req: FlightSearchRequest, i: number): FlightOffer {
  const rand = seededRandom(`${JSON.stringify(req)}#${i}`);
  const slices = req.legs.map((leg) => buildSlice(leg.from, leg.to, leg.date, rand));
  const carrier = slices[0].carrier;

  const km = req.legs.reduce((sum, l) => sum + distanceKm(l.from, l.to), 0);
  const perAdult = (2500 + km * 4.2) * CABIN_MULTIPLIER[req.cabin] * (0.8 + rand() * 0.6) * (1 - slices[0].stops * 0.07);
  const paxFactor = req.passengers.adults + req.passengers.children * 0.75 + req.passengers.infants * 0.1;
  const base = perAdult * paxFactor;
  const taxes = base * 0.14 + 850 * req.legs.length * (req.passengers.adults + req.passengers.children);
  const refundable = req.cabin !== "economy" || rand() < 0.35;

  const token: OfferToken = { v: 1, req, i };
  return {
    offerId: encodeToken(token),
    supplier: "mock",
    validatingCarrier: { code: carrier.code, name: carrier.name },
    slices: slices.map(({ carrier: _carrier, ...slice }) => slice),
    cabin: req.cabin,
    passengers: req.passengers,
    baggage: { checkedKg: req.cabin === "economy" ? (rand() < 0.5 ? 23 : 30) : 40, cabinKg: 7 },
    fare: { base: inr(base), taxes: inr(taxes), total: inr(base + taxes) },
    refundable,
    fareRules: {
      changeFee: inr(req.cabin === "economy" ? 3500 : 0),
      cancellationFee: refundable ? inr(3000 + base * 0.1) : undefined,
      notes: refundable
        ? ["Refundable subject to cancellation fee", "Date change permitted with fare difference"]
        : ["Non-refundable fare — only taxes are refundable", "Date change permitted with fee and fare difference"],
    },
    seatsLeft: 1 + Math.floor(rand() * 9),
  };
}

export class MockFlightProvider implements FlightProvider {
  readonly id = "mock";

  async searchPlaces(query: string) {
    return matchPlaces(AIRPORTS, query);
  }

  async search(req: FlightSearchRequest) {
    const count = 14 + (hashString(JSON.stringify(req)) % 10);
    return Array.from({ length: count }, (_, i) => buildOffer(req, i));
  }

  async revalidate(offerId: string): Promise<RevalidationResult> {
    const token = decodeToken<OfferToken>(offerId);
    if (!token || token.v !== 1) return { status: "unavailable", reason: "This fare is no longer valid." };
    if (token.req.legs.some((l) => l.date < new Date().toISOString().slice(0, 10))) {
      return { status: "unavailable", reason: "Departure date has passed." };
    }
    const offer = buildOffer(token.req, token.i);
    // Simulate fare movement: ~1 in 8 revalidations return a higher price.
    const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
    if (hashString(`${offerId}:${bucket}`) % 8 === 0) {
      const previousTotal = offer.fare.total;
      const bump = roundTo(offer.fare.base.amount * 0.06);
      offer.fare = {
        base: inr(offer.fare.base.amount + bump),
        taxes: offer.fare.taxes,
        total: inr(offer.fare.total.amount + bump),
      };
      return { status: "available", offer, priceChanged: true, previousTotal };
    }
    return { status: "available", offer, priceChanged: false };
  }

  async book() {
    return {
      supplierBookingRef: randomRef("MKF-", 8),
      pnr: randomRef("", 6),
      ticketStatus: "issued" as const,
      ticketNumbers: [String(Date.now()).slice(-10)],
    };
  }

  async quoteCancellation() {
    return {
      eligible: true,
      cancellationFee: inr(3500),
      refundAmount: inr(0),
      notes: ["Sandbox supplier: refund amount is returned by the live supplier at cancellation time."],
    };
  }

  async cancel(supplierBookingRef: string) {
    return { status: "cancelled" as const, refundAmount: inr(0), supplierReference: `CX-${supplierBookingRef}` };
  }
}
