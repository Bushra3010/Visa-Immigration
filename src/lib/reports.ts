import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Report aggregation (PRD §8.11). Aggregates in application code over
 * RLS-scoped rows — fine at launch volumes; move to SQL views / RPCs when
 * row counts grow.
 */

export type Row = Record<string, string | number>;
export type Table = { title: string; rows: Row[] };

const groupCount = <T,>(items: T[], key: (t: T) => string) => {
  const m = new Map<string, number>();
  for (const i of items) m.set(key(i), (m.get(key(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const CONVERTED = ["application_in_progress", "submitted", "under_review", "approved"];
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

export async function immigrationReports(db: SupabaseClient): Promise<Table[]> {
  const [{ data: leads }, { data: apps }, { data: docs }, { data: counsellors }] = await Promise.all([
    db.from("leads").select("destination_country, visa_type, status, assigned_counsellor_id, created_at, last_contacted_at"),
    db.from("applications").select("status, counsellor_id"),
    db.from("documents").select("status"),
    db.from("profiles").select("id, full_name").eq("role", "counsellor"),
  ]);
  const L = leads ?? [];
  const converted = L.filter((l) => CONVERTED.includes(l.status)).length;
  const names = new Map((counsellors ?? []).map((c) => [c.id, c.full_name]));
  const firstContactHours = L.filter((l) => l.last_contacted_at).map((l) => (new Date(l.last_contacted_at!).getTime() - new Date(l.created_at).getTime()) / 3_600_000);

  return [
    { title: "Leads by country", rows: groupCount(L, (l) => l.destination_country ?? "unknown").map(([country, leads]) => ({ country, leads })) },
    { title: "Leads by visa type", rows: groupCount(L, (l) => l.visa_type ?? "unknown").map(([visa_type, leads]) => ({ visa_type, leads })) },
    {
      title: "Conversion",
      rows: [
        { metric: "Total leads", value: L.length },
        { metric: "Converted to application", value: converted },
        { metric: "Conversion rate %", value: L.length ? Math.round((converted / L.length) * 1000) / 10 : 0 },
        { metric: "Avg hours to last contact", value: firstContactHours.length ? Math.round(sum(firstContactHours) / firstContactHours.length) : 0 },
      ],
    },
    {
      title: "Counsellor performance",
      rows: [...names.entries()].map(([id, name]) => {
        const mine = L.filter((l) => l.assigned_counsellor_id === id);
        const myApps = (apps ?? []).filter((a) => a.counsellor_id === id);
        return {
          counsellor: name ?? id,
          leads: mine.length,
          converted: mine.filter((l) => CONVERTED.includes(l.status)).length,
          applications: myApps.length,
          approved: myApps.filter((a) => a.status === "approved").length,
        };
      }),
    },
    { title: "Application status", rows: groupCount(apps ?? [], (a) => a.status).map(([status, applications]) => ({ status, applications })) },
    { title: "Documents by status", rows: groupCount(docs ?? [], (d) => d.status).map(([status, documents]) => ({ status, documents })) },
  ];
}

export async function travelReports(db: SupabaseClient): Promise<Table[]> {
  const [{ data: flights }, { data: hotels }] = await Promise.all([
    db.from("flight_bookings").select("supplier, status, refund_status, customer_amount, markup_amount"),
    db.from("hotel_bookings").select("supplier, status, refund_status, customer_amount, markup_amount"),
  ]);
  const all = [...(flights ?? []).map((f) => ({ ...f, product: "flight" })), ...(hotels ?? []).map((h) => ({ ...h, product: "hotel" }))];
  const confirmed = all.filter((b) => b.status === "confirmed");
  const suppliers = [...new Set(all.map((b) => `${b.product}:${b.supplier}`))];

  return [
    {
      title: "Bookings & revenue",
      rows: ["flight", "hotel"].map((product) => {
        const p = all.filter((b) => b.product === product);
        const c = p.filter((b) => b.status === "confirmed");
        return {
          product,
          bookings: p.length,
          confirmed: c.length,
          cancelled: p.filter((b) => b.status === "cancelled").length,
          refunds: p.filter((b) => b.refund_status !== "none").length,
          booking_revenue: sum(c.map((b) => Number(b.customer_amount))),
          markup_revenue: sum(c.map((b) => Number(b.markup_amount))),
        };
      }),
    },
    {
      title: "Supplier-wise bookings",
      rows: suppliers.map((key) => {
        const [product, supplier] = key.split(":");
        const s = all.filter((b) => b.product === product && b.supplier === supplier);
        return { product, supplier, bookings: s.length, confirmed: s.filter((b) => b.status === "confirmed").length, revenue: sum(s.filter((b) => b.status === "confirmed").map((b) => Number(b.customer_amount))) };
      }),
    },
    { title: "Totals", rows: [{ confirmed_bookings: confirmed.length, markup_revenue: sum(confirmed.map((b) => Number(b.markup_amount))) }] },
  ];
}

export async function financialReports(db: SupabaseClient): Promise<Table[]> {
  const { data } = await db.from("payments").select("amount, status, service, refunded_amount, refund_status");
  const P = data ?? [];
  const ok = P.filter((p) => ["succeeded", "refunded", "partially_refunded"].includes(p.status));
  return [
    {
      title: "Summary",
      rows: [
        { metric: "Total sales", value: sum(ok.map((p) => Number(p.amount))) },
        { metric: "Refunds", value: sum(P.map((p) => Number(p.refunded_amount))) },
        { metric: "Net", value: sum(ok.map((p) => Number(p.amount))) - sum(P.map((p) => Number(p.refunded_amount))) },
        { metric: "Outstanding (pending payments)", value: sum(P.filter((p) => ["created", "pending"].includes(p.status)).map((p) => Number(p.amount))) },
      ],
    },
    { title: "Payments by status", rows: groupCount(P, (p) => p.status).map(([status, payments]) => ({ status, payments })) },
    {
      title: "Service-wise revenue",
      rows: [...new Set(ok.map((p) => p.service))].map((service) => ({ service, payments: ok.filter((p) => p.service === service).length, revenue: sum(ok.filter((p) => p.service === service).map((p) => Number(p.amount))) })),
    },
  ];
}

export function toCsv(rows: Row[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  // Prefix formula-like cells to prevent CSV injection in spreadsheet apps.
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\n");
}
