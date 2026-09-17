export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-IN", opts).format(d);
}

export function humanize(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Staff date-time inputs are in the business timezone (IST, UTC+05:30)
 * until per-user timezones are supported.
 */
export const BUSINESS_TZ_OFFSET = "+05:30";

export function toBusinessInput(iso: string | null) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 16);
}

export function fromBusinessInput(value: string) {
  return new Date(`${value.length === 10 ? `${value}T00:00` : value}:00${BUSINESS_TZ_OFFSET}`).toISOString();
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
