import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/app-shell";
import { CancelBooking } from "@/components/app/cancel-booking";
import { StatusBadge } from "@/components/app/status-badge";
import { mealLabel } from "@/components/travel/hotel-card";
import { FlightSummary } from "@/components/travel/flight-card";
import { Card, Notice } from "@/components/ui/primitives";
import type { PricedFlightOffer, PricedRoomRate } from "@/lib/travel/service";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Booking details" };

type Flight = { id: string; pnr: string | null; ticket_status: string; ticket_numbers: string[]; status: string; refund_status: string; customer_amount: number; currency: string; itinerary: PricedFlightOffer; travellers: { title: string; firstName: string; lastName: string; type: string }[] };
type Hotel = { id: string; confirmation_number: string | null; status: string; refund_status: string; customer_amount: number; currency: string; check_in: string; check_out: string; guests: { title: string; firstName: string; lastName: string }[]; hotel: { name: string; address: string; city: string; rate: PricedRoomRate; rooms: unknown[] } };

export default async function BookingDetailPage({ params, searchParams }: PageProps<"/dashboard/bookings/[code]">) {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("travel_bookings")
    .select("id, code, status, total_amount, currency, contact_email, created_at, flight_bookings(*), hotel_bookings(*), payments(code, status, amount, currency, transaction_id, created_at)")
    .eq("code", code)
    .maybeSingle();
  if (!data) notFound();
  const flights = data.flight_bookings as unknown as Flight[];
  const hotels = data.hotel_bookings as unknown as Hotel[];
  const payments = data.payments as unknown as { code: string; status: string; amount: number; currency: string; transaction_id: string | null }[];

  return (
    <>
      <PageHeader title={`Booking ${data.code}`} description={`Booked ${formatDate(data.created_at)} · ${formatMoney(Number(data.total_amount), data.currency)}`} actions={<StatusBadge status={data.status} />} />
      {isNew && data.status === "confirmed" && <Notice tone="success" className="mb-6">Booking confirmed! Your e-ticket/voucher has been sent to {data.contact_email}.</Notice>}
      {data.status === "failed" && <Notice tone="danger" className="mb-6">We couldn&apos;t confirm part of this booking with the supplier. Our travel team has been alerted and will arrange a refund or rebooking.</Notice>}

      <div className="space-y-6">
        {flights.map((f) => (
          <Card key={f.id} className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Flight</h2>
              <div className="flex items-center gap-3 text-sm">
                {f.pnr && <span>PNR <span className="font-mono font-semibold">{f.pnr}</span></span>}
                <span className="text-muted">Ticket: {humanize(f.ticket_status)}</span>
                <StatusBadge status={f.status} />
              </div>
            </div>
            <FlightSummary offer={f.itinerary} />
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <p className="font-medium">Travellers</p>
              <ul className="mt-1 text-ink-soft">{f.travellers.map((t, i) => <li key={i}>{t.title} {t.firstName} {t.lastName} <span className="text-muted">({t.type})</span>{f.ticket_numbers[i] && <span className="text-muted"> · Ticket {f.ticket_numbers[i]}</span>}</li>)}</ul>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{formatMoney(Number(f.customer_amount), f.currency)}</p>
              {f.refund_status !== "none" && <p className="text-sm">Refund: <StatusBadge status={f.refund_status} /></p>}
              {f.status === "confirmed" && <CancelBooking kind="flight" id={f.id} />}
            </div>
          </Card>
        ))}

        {hotels.map((h) => (
          <Card key={h.id} className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Hotel</h2>
              <div className="flex items-center gap-3 text-sm">
                {h.confirmation_number && <span>Confirmation <span className="font-mono font-semibold">{h.confirmation_number}</span></span>}
                <StatusBadge status={h.status} />
              </div>
            </div>
            <p className="font-medium">{h.hotel.name}</p>
            <p className="text-sm text-muted">{h.hotel.address}, {h.hotel.city}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <div><dt className="text-muted">Check-in</dt><dd>{formatDate(h.check_in)}</dd></div>
              <div><dt className="text-muted">Check-out</dt><dd>{formatDate(h.check_out)}</dd></div>
              <div><dt className="text-muted">Room</dt><dd>{h.hotel.rooms.length} × {h.hotel.rate.roomName}</dd></div>
              <div><dt className="text-muted">Board</dt><dd>{mealLabel(h.hotel.rate.mealPlan)}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-ink-soft">{h.hotel.rate.cancellationPolicy}</p>
            <p className="mt-2 text-sm">Lead guest: {h.guests.map((g) => `${g.title} ${g.firstName} ${g.lastName}`).join(", ")}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">{formatMoney(Number(h.customer_amount), h.currency)}</p>
              {h.refund_status !== "none" && <p className="text-sm">Refund: <StatusBadge status={h.refund_status} /></p>}
              {h.status === "confirmed" && <CancelBooking kind="hotel" id={h.id} />}
            </div>
          </Card>
        ))}

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Payment</h2>
          {payments.map((p) => (
            <div key={p.code} className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-mono">{p.code}{p.transaction_id && <span className="text-muted"> · Txn {p.transaction_id}</span>}</span>
              <span className="flex items-center gap-2">{formatMoney(Number(p.amount), p.currency)} <StatusBadge status={p.status} /></span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
