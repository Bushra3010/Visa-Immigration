import { describe, expect, it } from "vitest";
import { validateTravellers } from "@/lib/bookings/schemas";
import { MockFlightProvider } from "@/lib/travel/providers/mock-flight";
import { MockHotelProvider } from "@/lib/travel/providers/mock-hotel";
import { flightSearchSchema, hotelSearchSchema } from "@/lib/travel/schemas";
import { todayPlus } from "@/lib/utils";

const flightReq = flightSearchSchema.parse({
  tripType: "round_trip",
  legs: [{ from: "DEL", to: "YYZ", date: todayPlus(30) }, { from: "YYZ", to: "DEL", date: todayPlus(40) }],
  passengers: { adults: 2, children: 1, infants: 0 },
  cabin: "economy",
});

describe("flight search validation", () => {
  it("rejects past dates, same origin/destination and too many infants", () => {
    const bad = flightSearchSchema.safeParse({
      tripType: "one_way",
      legs: [{ from: "DEL", to: "DEL", date: "2000-01-01" }],
      passengers: { adults: 1, children: 0, infants: 2 },
      cabin: "economy",
    });
    expect(bad.success).toBe(false);
    expect(bad.error?.issues.map((i) => i.message)).toEqual(expect.arrayContaining(["Origin and destination must differ", "Date is in the past", "Each infant needs an accompanying adult"]));
  });
});

describe("mock flight provider", () => {
  const provider = new MockFlightProvider();

  it("returns deterministic offers for the same search", async () => {
    const a = await provider.search(flightReq);
    const b = await provider.search(flightReq);
    expect(a.length).toBeGreaterThan(10);
    expect(a.map((o) => o.fare.total.amount)).toEqual(b.map((o) => o.fare.total.amount));
    expect(a[0].slices).toHaveLength(2);
    expect(a[0].passengers).toEqual(flightReq.passengers);
  });

  it("revalidates an offer by id", async () => {
    const [offer] = await provider.search(flightReq);
    const result = await provider.revalidate(offer.offerId);
    expect(result.status).toBe("available");
  });

  it("rejects garbage offer ids", async () => {
    expect((await provider.revalidate("not-a-real-offer")).status).toBe("unavailable");
  });
});

describe("mock hotel provider", () => {
  const provider = new MockHotelProvider();
  const req = hotelSearchSchema.parse({ destination: "toronto", checkIn: todayPlus(30), checkOut: todayPlus(33), rooms: [{ adults: 2, children: 0 }] });

  it("searches, loads rates and rechecks a rate with stay details", async () => {
    const hotels = await provider.search(req);
    expect(hotels.length).toBeGreaterThan(5);
    const details = await provider.getHotel(hotels[0].hotelId, req);
    expect(details?.rates.length).toBeGreaterThan(1);
    const recheck = await provider.recheckRate(details!.rates[0].rateId);
    expect(recheck.status).toBe("available");
    if (recheck.status === "available") expect(recheck.stay.checkIn).toBe(req.checkIn);
  });
});

describe("traveller validation", () => {
  const base = { title: "Mr", gender: "male", nationality: "Indian", passportNumber: "Z1234567", passportExpiry: todayPlus(900), passportCountry: "India" } as const;
  const opts = { passengers: { adults: 1, children: 0, infants: 0 }, travelDate: todayPlus(30), lastTravelDate: todayPlus(40), international: true };

  it("accepts a valid adult with passport", () => {
    expect(validateTravellers([{ ...base, type: "adult", firstName: "Asha", lastName: "Rao", dateOfBirth: "1990-05-01" }], opts).success).toBe(true);
  });

  it("requires passport details for international travel and valid ages", () => {
    const r = validateTravellers([{ ...base, type: "adult", firstName: "Asha", lastName: "Rao", dateOfBirth: todayPlus(-365 * 5), passportNumber: "" }], opts);
    expect(r.success).toBe(false);
  });

  it("rejects passports expiring before travel ends", () => {
    const r = validateTravellers([{ ...base, type: "adult", firstName: "Asha", lastName: "Rao", dateOfBirth: "1990-05-01", passportExpiry: todayPlus(35) }], opts);
    expect(r.success).toBe(false);
  });

  it("rejects traveller counts that don't match the fare", () => {
    const r = validateTravellers([], opts);
    expect(r.success).toBe(false);
  });
});

describe("multi-city search params", () => {
  it("round-trips legs through URL params", async () => {
    const { encodeLeg, flightSearchFromParams } = await import("@/lib/travel/schemas");
    const legs = [{ from: "DEL", to: "BLR", date: todayPlus(10) }, { from: "BLR", to: "BOM", date: todayPlus(14) }];
    const parsed = flightSearchFromParams({ trip: "multi_city", leg: legs.map(encodeLeg), adults: "2" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.legs).toEqual(legs);
  });

  it("requires at least two flights", async () => {
    const { encodeLeg, flightSearchFromParams } = await import("@/lib/travel/schemas");
    expect(flightSearchFromParams({ trip: "multi_city", leg: encodeLeg({ from: "DEL", to: "BLR", date: todayPlus(10) }) }).success).toBe(false);
  });
});
