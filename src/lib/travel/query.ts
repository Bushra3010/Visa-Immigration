type Params = Record<string, string | string[] | undefined>;

/** Rebuilds a query string from selected params (drops unknown keys). */
export function pickQuery(params: Params, keys: string[]) {
  const q = new URLSearchParams();
  for (const k of keys) {
    const v = params[k];
    if (typeof v === "string" && v) q.set(k, v);
  }
  return q.toString();
}

export const HOTEL_QUERY_KEYS = ["destination", "checkin", "checkout", "rooms", "adults", "children"];
export const FLIGHT_QUERY_KEYS = ["trip", "from", "to", "depart", "return", "leg", "adults", "children", "infants", "cabin"];

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
}
