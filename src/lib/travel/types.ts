/**
 * Supplier-agnostic travel contracts (PRD §12.2). Every Flight/Hotel supplier
 * (TBO, Amadeus, Duffel, Hotelbeds, ...) is adapted to these shapes, so the
 * rest of the platform never depends on a specific supplier's API.
 */

export type Money = { amount: number; currency: string };

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type TripType = "one_way" | "round_trip" | "multi_city";

export type Passengers = { adults: number; children: number; infants: number };

export type Place = { code: string; name: string; city: string; country: string; countryCode: string };

export type FlightSearchRequest = {
  tripType: TripType;
  legs: { from: string; to: string; date: string }[]; // IATA codes, YYYY-MM-DD
  passengers: Passengers;
  cabin: CabinClass;
};

export type FlightSegment = {
  marketingCarrier: { code: string; name: string };
  flightNumber: string;
  from: string;
  to: string;
  departAt: string; // ISO local time at origin
  arriveAt: string;
  durationMinutes: number;
};

export type FlightSlice = {
  from: string;
  to: string;
  segments: FlightSegment[];
  durationMinutes: number;
  stops: number;
};

export type FareBreakdown = { base: Money; taxes: Money; total: Money };

export type FlightOffer = {
  /** Opaque supplier token used for revalidation and booking. */
  offerId: string;
  supplier: string;
  validatingCarrier: { code: string; name: string };
  slices: FlightSlice[];
  cabin: CabinClass;
  passengers: Passengers;
  baggage: { checkedKg: number; cabinKg: number };
  fare: FareBreakdown;
  refundable: boolean;
  fareRules: { changeFee?: Money; cancellationFee?: Money; notes: string[] };
  seatsLeft?: number;
};

export type RevalidationResult =
  | { status: "available"; offer: FlightOffer; priceChanged: boolean; previousTotal?: Money }
  | { status: "unavailable"; reason: string };

export type Traveller = {
  type: "adult" | "child" | "infant";
  title?: string;
  firstName: string;
  lastName: string;
  gender?: "male" | "female" | "other";
  dateOfBirth: string;
  nationality: string;
  passportNumber?: string;
  passportExpiry?: string;
  passportCountry?: string;
};

export type Contact = { email: string; mobile: string };

export type FlightBookingResult = {
  supplierBookingRef: string;
  pnr: string;
  ticketStatus: "issued" | "pending" | "failed";
  ticketNumbers: string[];
};

export type CancellationQuote = {
  eligible: boolean;
  cancellationFee: Money;
  refundAmount: Money;
  notes: string[];
};

export type CancellationResult = {
  status: "cancelled" | "pending" | "rejected";
  refundAmount: Money;
  supplierReference?: string;
};

export interface FlightProvider {
  readonly id: string;
  searchPlaces(query: string): Promise<Place[]>;
  search(request: FlightSearchRequest): Promise<FlightOffer[]>;
  revalidate(offerId: string): Promise<RevalidationResult>;
  book(offerId: string, travellers: Traveller[], contact: Contact): Promise<FlightBookingResult>;
  quoteCancellation(supplierBookingRef: string): Promise<CancellationQuote>;
  cancel(supplierBookingRef: string): Promise<CancellationResult>;
}

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

export type HotelSearchRequest = {
  destination: string; // destination code from searchDestinations
  checkIn: string;
  checkOut: string;
  rooms: { adults: number; children: number; childAges?: number[] }[];
  starRatings?: number[];
};

export type MealPlan = "room_only" | "breakfast" | "half_board" | "full_board" | "all_inclusive";

export type RoomRate = {
  /** Opaque supplier token for rate recheck and booking. */
  rateId: string;
  roomName: string;
  mealPlan: MealPlan;
  refundable: boolean;
  cancellationPolicy: string;
  freeCancellationUntil?: string;
  price: FareBreakdown; // total for the stay, all rooms
};

export type HotelSummary = {
  hotelId: string;
  supplier: string;
  name: string;
  starRating: number;
  address: string;
  city: string;
  countryCode: string;
  images: string[];
  amenities: string[];
  guestRating?: number;
  category: string;
  fromPrice: Money;
};

export type HotelDetails = HotelSummary & {
  description: string;
  policies: string[];
  rates: RoomRate[];
};

export type HotelStay = {
  hotel: Pick<HotelSummary, "hotelId" | "name" | "starRating" | "address" | "city" | "countryCode">;
  checkIn: string;
  checkOut: string;
  rooms: HotelSearchRequest["rooms"];
};

export type RateRecheckResult =
  | { status: "available"; rate: RoomRate; stay: HotelStay; priceChanged: boolean; previousTotal?: Money }
  | { status: "unavailable"; reason: string };

export type HotelBookingResult = {
  supplierBookingRef: string;
  confirmationNumber: string;
  status: "confirmed" | "pending" | "failed";
};

export interface HotelProvider {
  readonly id: string;
  searchDestinations(query: string): Promise<Place[]>;
  search(request: HotelSearchRequest): Promise<HotelSummary[]>;
  getHotel(hotelId: string, request: HotelSearchRequest): Promise<HotelDetails | null>;
  recheckRate(rateId: string): Promise<RateRecheckResult>;
  book(rateId: string, guests: Traveller[], contact: Contact): Promise<HotelBookingResult>;
  quoteCancellation(supplierBookingRef: string): Promise<CancellationQuote>;
  cancel(supplierBookingRef: string): Promise<CancellationResult>;
}
