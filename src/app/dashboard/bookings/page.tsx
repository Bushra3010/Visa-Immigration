import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata: Metadata = { title: "My bookings" };

type Row = {
  code: string; total_amount: number; currency: string; status: string; created_at: string;
  flight_bookings: { itinerary: { slices: { from: string; to: string }[] }; pnr: string | null }[];
  hotel_bookings: { hotel: { name: string; city: string }; check_in: string }[];
};

export default async function BookingsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase
    .from("travel_bookings")
    .select("code, total_amount, currency, status, created_at, flight_bookings(itinerary, pnr), hotel_bookings(hotel, check_in)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Flight & hotel bookings" description="Booking history, e-tickets and hotel vouchers." actions={<Link href="/flights" className={buttonClass("accent", "sm")}>Book travel</Link>} />
      {rows.length ? (
        <DataTable head={["Travel Booking ID", "Trip", "Amount", "Status", "Booked on"]}>
          {rows.map((b) => (
            <tr key={b.code}>
              <Td><Link href={`/dashboard/bookings/${b.code}`} className="font-mono font-medium text-brand-600">{b.code}</Link></Td>
              <Td>
                {b.flight_bookings.map((f, i) => <p key={i}>✈ {f.itinerary.slices.map((s) => `${s.from}→${s.to}`).join(" · ")}{f.pnr && <span className="text-muted"> · PNR {f.pnr}</span>}</p>)}
                {b.hotel_bookings.map((h, i) => <p key={i}>🏨 {h.hotel.name}, {h.hotel.city} · {formatDate(h.check_in)}</p>)}
              </Td>
              <Td>{formatMoney(Number(b.total_amount), b.currency)}</Td>
              <Td><StatusBadge status={b.status} /></Td>
              <Td className="text-muted">{formatDate(b.created_at)}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState title="No bookings yet" description="Search flights and hotels to plan your trip." action={<Link href="/flights" className={buttonClass("accent", "sm")}>Search flights</Link>} />
      )}
    </>
  );
}
