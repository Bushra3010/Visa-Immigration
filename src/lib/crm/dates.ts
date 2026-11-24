/** Date-range presets for CRM filters. All ranges are in business time (IST, UTC+05:30). */

export const RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
] as const;
export type RangeKey = (typeof RANGE_PRESETS)[number]["value"];

const IST_MS = 330 * 60_000;
const DAY = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in IST as YYYY-MM-DD. */
export function istToday(now = Date.now()) {
  return new Date(now + IST_MS).toISOString().slice(0, 10);
}

/** Midnight IST of a YYYY-MM-DD date, as a UTC Date. */
export function istMidnight(date: string) {
  return new Date(`${date}T00:00:00+05:30`);
}

export function addDays(date: string, days: number) {
  return new Date(istMidnight(date).getTime() + days * DAY + IST_MS).toISOString().slice(0, 10);
}

export type DateRange = { key: RangeKey; from: Date; to: Date; fromDate: string; toDate: string; label: string };

/**
 * Resolves `?range=…&from=…&to=…` into a half-open [from, to) interval.
 * `fromDate`/`toDate` are the inclusive calendar days, for date columns.
 */
export function resolveRange(params: { range?: string; from?: string; to?: string }, fallback: RangeKey = "30d", now = Date.now()): DateRange {
  const today = istToday(now);
  let key = (RANGE_PRESETS.some((p) => p.value === params.range) ? params.range : fallback) as RangeKey;
  let fromDate: string;
  let toDate = today;

  switch (key) {
    case "today": fromDate = today; break;
    case "yesterday": fromDate = addDays(today, -1); toDate = fromDate; break;
    case "7d": fromDate = addDays(today, -6); break;
    case "30d": fromDate = addDays(today, -29); break;
    case "month": fromDate = `${today.slice(0, 7)}-01`; break;
    case "all": fromDate = "2000-01-01"; break;
    case "custom": {
      const f = params.from && ISO_DATE.test(params.from) ? params.from : addDays(today, -29);
      const t = params.to && ISO_DATE.test(params.to) ? params.to : today;
      [fromDate, toDate] = f <= t ? [f, t] : [t, f];
      break;
    }
    default: key = "30d"; fromDate = addDays(today, -29);
  }
  const label = key === "custom" ? `${fromDate} → ${toDate}` : RANGE_PRESETS.find((p) => p.value === key)!.label;
  return { key, from: istMidnight(fromDate), to: istMidnight(addDays(toDate, 1)), fromDate, toDate, label };
}

/** IST day bounds for "today" lists (follow-ups). */
export function todayBounds(now = Date.now()) {
  const today = istToday(now);
  return { start: istMidnight(today), end: istMidnight(addDays(today, 1)) };
}

/** Combines a date (YYYY-MM-DD) and optional time (HH:MM) in IST into an ISO timestamp. */
export function istDateTime(date: string, time?: string | null) {
  return new Date(`${date}T${time && /^\d{2}:\d{2}$/.test(time) ? time : "10:00"}:00+05:30`).toISOString();
}

/** Splits an ISO timestamp into IST date + time input values. */
export function splitIst(iso: string | null | undefined) {
  if (!iso) return { date: "", time: "" };
  const local = new Date(new Date(iso).getTime() + IST_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Current time (ms). Wrapped so components can take it lazily, e.g. useState(nowMs). */
export const nowMs = () => Date.now();
