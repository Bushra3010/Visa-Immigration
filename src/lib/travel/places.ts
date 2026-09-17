import type { Place } from "./types";

/** Reference airports used by the sandbox provider and as offline fallback. */
export const AIRPORTS: Place[] = [
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "India", countryCode: "IN" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", country: "India", countryCode: "IN" },
  { code: "BLR", name: "Kempegowda International", city: "Bengaluru", country: "India", countryCode: "IN" },
  { code: "HYD", name: "Rajiv Gandhi International", city: "Hyderabad", country: "India", countryCode: "IN" },
  { code: "MAA", name: "Chennai International", city: "Chennai", country: "India", countryCode: "IN" },
  { code: "CCU", name: "Netaji Subhas Chandra Bose International", city: "Kolkata", country: "India", countryCode: "IN" },
  { code: "ATQ", name: "Sri Guru Ram Dass Jee International", city: "Amritsar", country: "India", countryCode: "IN" },
  { code: "COK", name: "Cochin International", city: "Kochi", country: "India", countryCode: "IN" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International", city: "Ahmedabad", country: "India", countryCode: "IN" },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", countryCode: "CA" },
  { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canada", countryCode: "CA" },
  { code: "YUL", name: "Montréal–Trudeau International", city: "Montreal", country: "Canada", countryCode: "CA" },
  { code: "YYC", name: "Calgary International", city: "Calgary", country: "Canada", countryCode: "CA" },
  { code: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", countryCode: "GB" },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", countryCode: "GB" },
  { code: "BHX", name: "Birmingham", city: "Birmingham", country: "United Kingdom", countryCode: "GB" },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", countryCode: "US" },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", countryCode: "US" },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", countryCode: "US" },
  { code: "IAD", name: "Washington Dulles International", city: "Washington, D.C.", country: "United States", countryCode: "US" },
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", countryCode: "AU" },
  { code: "MEL", name: "Melbourne", city: "Melbourne", country: "Australia", countryCode: "AU" },
  { code: "BNE", name: "Brisbane", city: "Brisbane", country: "Australia", countryCode: "AU" },
  { code: "PER", name: "Perth", city: "Perth", country: "Australia", countryCode: "AU" },
  { code: "AKL", name: "Auckland", city: "Auckland", country: "New Zealand", countryCode: "NZ" },
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", countryCode: "DE" },
  { code: "MUC", name: "Munich", city: "Munich", country: "Germany", countryCode: "DE" },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", countryCode: "DE" },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", countryCode: "FR" },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", countryCode: "AE" },
  { code: "AUH", name: "Zayed International", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE" },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", countryCode: "QA" },
  { code: "SIN", name: "Changi", city: "Singapore", country: "Singapore", countryCode: "SG" },
];

export const AIRPORTS_BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function matchPlaces(places: Place[], query: string, limit = 8): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return places.slice(0, limit);
  return places
    .filter(
      (p) =>
        p.code.toLowerCase() === q ||
        p.city.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q),
    )
    .sort((a, b) => Number(b.code.toLowerCase() === q) - Number(a.code.toLowerCase() === q))
    .slice(0, limit);
}

export const HOTEL_DESTINATIONS: Place[] = Array.from(
  new Map(
    AIRPORTS.map((a) => [
      a.city,
      { code: a.city.toLowerCase().replace(/[^a-z]+/g, "-"), name: a.city, city: a.city, country: a.country, countryCode: a.countryCode },
    ]),
  ).values(),
);
