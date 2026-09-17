import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "Travel bookings" };

type TB = { code: string; contact_email: string; user: { full_name: string } | null };

export default async function AdminTravelPage({ searchParams }: PageProps<"/admin/travel">) {
  await requireSection("travel");
  const { tab = "flights" } = await searchParams;
  const supabase = await createClient();
  const tabs = [["flights", "Flights"], ["hotels", "Hotels"], ["searches", "Search logs"]] as const;

  let content: React.ReactNode = null;
  if (tab === "hotels") {
    const { data } = await supabase.from("hotel_bookings").select("id, supplier, supplier_booking_ref, confirmation_number, hotel, check_in, check_out, supplier_amount, markup_amount, customer_amount, currency, status, refund_status, voucher_url, created_at, travel_bookings(code, contact_email, user:profiles!travel_bookings_user_id_fkey(full_name))").order("created_at", { ascending: false }).limit(200);
    content = (
      <DataTable head={["Booking", "Customer", "Hotel / stay", "Confirmation", "Voucher", "Supplier", "Amount (cost + markup)", "Status", "Refund", "Booked"]}>
        {(data ?? []).map((h) => {
          const tb = h.travel_bookings as unknown as TB;
          return (
            <tr key={h.id}>
              <Td className="font-mono text-xs">{tb.code}</Td>
              <Td className="text-xs">{tb.user?.full_name}<br /><span className="text-muted">{tb.contact_email}</span></Td>
              <Td className="text-xs">{(h.hotel as { name: string }).name}<br />{formatDate(h.check_in)} – {formatDate(h.check_out)}</Td>
              <Td className="font-mono text-xs">{h.confirmation_number ?? "—"}</Td>
              <Td className="text-xs">{h.voucher_url ? <a href={h.voucher_url} className="text-brand-600">Voucher</a> : "Pending"}</Td>
              <Td className="text-xs">{h.supplier}<br /><span className="font-mono text-muted">{h.supplier_booking_ref}</span></Td>
              <Td className="text-xs">{formatMoney(Number(h.customer_amount), h.currency)}<br /><span className="text-muted">{formatMoney(Number(h.supplier_amount), h.currency)} + {formatMoney(Number(h.markup_amount), h.currency)}</span></Td>
              <Td><StatusBadge status={h.status} /></Td>
              <Td>{h.refund_status === "none" ? "—" : <StatusBadge status={h.refund_status} />}</Td>
              <Td className="text-xs text-muted">{formatDate(h.created_at)}</Td>
            </tr>
          );
        })}
      </DataTable>
    );
  } else if (tab === "searches") {
    const { data } = await supabase.from("flight_search_logs").select("id, supplier, request, result_count, duration_ms, error, created_at").order("created_at", { ascending: false }).limit(200);
    content = (
      <DataTable head={["Time", "Supplier", "Route", "Pax / cabin", "Results", "Duration", "Error"]}>
        {(data ?? []).map((l) => {
          const r = l.request as { legs: { from: string; to: string; date: string }[]; passengers: { adults: number; children: number; infants: number }; cabin: string };
          return (
            <tr key={l.id}>
              <Td className="text-xs text-muted">{formatDate(l.created_at, { dateStyle: "short", timeStyle: "short" })}</Td>
              <Td className="text-xs">{l.supplier}</Td>
              <Td className="text-xs">{r.legs.map((x) => `${x.from}→${x.to} ${x.date}`).join(", ")}</Td>
              <Td className="text-xs">{r.passengers.adults}A {r.passengers.children}C {r.passengers.infants}I · {r.cabin}</Td>
              <Td>{l.result_count ?? "—"}</Td>
              <Td className="text-xs">{l.duration_ms} ms</Td>
              <Td className="text-xs text-danger">{l.error}</Td>
            </tr>
          );
        })}
      </DataTable>
    );
  } else {
    const { data } = await supabase.from("flight_bookings").select("id, supplier, supplier_booking_ref, pnr, ticket_status, itinerary, supplier_amount, markup_amount, customer_amount, currency, status, refund_status, created_at, travel_bookings(code, contact_email, user:profiles!travel_bookings_user_id_fkey(full_name))").order("created_at", { ascending: false }).limit(200);
    content = (
      <DataTable head={["Booking", "Customer", "Itinerary", "PNR", "Ticket", "Supplier", "Amount (cost + markup)", "Status", "Refund", "Booked"]}>
        {(data ?? []).map((f) => {
          const tb = f.travel_bookings as unknown as TB;
          const it = f.itinerary as { slices: { from: string; to: string; segments: { departAt: string }[] }[]; validatingCarrier: { name: string } };
          return (
            <tr key={f.id}>
              <Td className="font-mono text-xs">{tb.code}</Td>
              <Td className="text-xs">{tb.user?.full_name}<br /><span className="text-muted">{tb.contact_email}</span></Td>
              <Td className="text-xs">{it.validatingCarrier.name}<br />{it.slices.map((s) => `${s.from}→${s.to} ${s.segments[0].departAt.slice(0, 10)}`).join(", ")}</Td>
              <Td className="font-mono text-xs">{f.pnr ?? "—"}</Td>
              <Td><StatusBadge status={f.ticket_status} /></Td>
              <Td className="text-xs">{f.supplier}<br /><span className="font-mono text-muted">{f.supplier_booking_ref}</span></Td>
              <Td className="text-xs">{formatMoney(Number(f.customer_amount), f.currency)}<br /><span className="text-muted">{formatMoney(Number(f.supplier_amount), f.currency)} + {formatMoney(Number(f.markup_amount), f.currency)}</span></Td>
              <Td><StatusBadge status={f.status} /></Td>
              <Td>{f.refund_status === "none" ? "—" : <StatusBadge status={f.refund_status} />}</Td>
              <Td className="text-xs text-muted">{formatDate(f.created_at)}</Td>
            </tr>
          );
        })}
      </DataTable>
    );
  }

  return (
    <>
      <PageHeader title="Travel bookings" />
      <nav className="mb-4 flex gap-2" aria-label="Travel sections">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/admin/travel?tab=${id}`} aria-current={tab === id ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", tab === id ? "bg-brand-600 text-white ring-brand-600" : "bg-white")}>{label}</Link>
        ))}
      </nav>
      {content}
    </>
  );
}
