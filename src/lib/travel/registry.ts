import "server-only";
import { env } from "@/lib/env";
import { MockFlightProvider } from "./providers/mock-flight";
import { MockHotelProvider } from "./providers/mock-hotel";
import type { FlightProvider, HotelProvider } from "./types";

/**
 * Supplier registry (PRD §12.2). To add a supplier, implement FlightProvider /
 * HotelProvider in ./providers, register the factory here, and select it with
 * FLIGHT_PROVIDER / HOTEL_PROVIDER. Credentials are read inside the adapter
 * from server env vars — never from the database or the browser.
 */
const flightProviders: Record<string, () => FlightProvider> = {
  mock: () => new MockFlightProvider(),
  // tbo: () => new TboFlightProvider(),
  // amadeus: () => new AmadeusFlightProvider(),
  // duffel: () => new DuffelFlightProvider(),
};

const hotelProviders: Record<string, () => HotelProvider> = {
  mock: () => new MockHotelProvider(),
  // tbo: () => new TboHotelProvider(),
  // hotelbeds: () => new HotelbedsProvider(),
};

export function getFlightProvider(id = env.flightProvider): FlightProvider {
  const factory = flightProviders[id];
  if (!factory) throw new Error(`Unknown flight provider "${id}"`);
  // Demo data is allowed until a live supplier is connected; set DISABLE_MOCK_SUPPLIERS=true once it is.
  if (id === "mock" && process.env.DISABLE_MOCK_SUPPLIERS === "true") {
    throw new Error("Mock flight supplier is disabled (DISABLE_MOCK_SUPPLIERS=true)");
  }
  return factory();
}

export function getHotelProvider(id = env.hotelProvider): HotelProvider {
  const factory = hotelProviders[id];
  if (!factory) throw new Error(`Unknown hotel provider "${id}"`);
  if (id === "mock" && process.env.DISABLE_MOCK_SUPPLIERS === "true") {
    throw new Error("Mock hotel supplier is disabled (DISABLE_MOCK_SUPPLIERS=true)");
  }
  return factory();
}
