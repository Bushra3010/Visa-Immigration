import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { BookingShell, PriceLines } from "@/components/travel/booking-shell";
import { Button, buttonClass } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth";
import { completeMockPayment, retryMockPayment } from "@/lib/bookings/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function CheckoutPage({ params, searchParams }: PageProps<"/checkout/[code]">) {
  const { code } = await params;
  const { error } = await searchParams;
  const viewer = await requireViewer(`/checkout/${code}`);

  const { data: payment } = await createAdminClient()
    .from("payments")
    .select("code, amount, currency, status, service, gateway, travel_bookings(code, flight_bookings(itinerary, customer_amount), hotel_bookings(hotel, check_in, check_out, customer_amount))")
    .eq("code", decodeURIComponent(code))
    .eq("user_id", viewer.id)
    .maybeSingle();
  if (!payment) notFound();

  type TB = { code: string; flight_bookings: { itinerary: { slices: { from: string; to: string }[] }; customer_amount: number }[]; hotel_bookings: { hotel: { name: string }; check_in: string; check_out: string; customer_amount: number }[] };
  const tb = payment.travel_bookings as unknown as TB | null;
  if (payment.status === "succeeded" && tb) redirect(`/dashboard/bookings/${tb.code}`);

  const lines = [
    ...(tb?.flight_bookings ?? []).map((f) => ({ label: `Flight ${f.itinerary.slices.map((s) => `${s.from}→${s.to}`).join(", ")}`, amount: Number(f.customer_amount) })),
    ...(tb?.hotel_bookings ?? []).map((h) => ({ label: `${h.hotel.name} (${formatDate(h.check_in)}–${formatDate(h.check_out)})`, amount: Number(h.customer_amount) })),
  ];

  return (
    <BookingShell title="Payment" step={2} summary={<PriceLines currency={payment.currency} total={Number(payment.amount)} lines={lines} />}>
      <div className="space-y-4 rounded-xl border border-line bg-white p-6">
        <p className="text-sm text-muted">Payment reference <span className="font-mono text-ink">{payment.code}</span>{tb && <> · Travel Booking ID <span className="font-mono text-ink">{tb.code}</span></>}</p>
        {error === "failed" && <Notice tone="danger">Payment failed. No money was taken — please try again.</Notice>}
        {error === "invalid" && <Notice tone="danger">This payment can no longer be completed.</Notice>}

        {payment.status === "pending" && payment.gateway === "mock" && (
          <>
            <Notice tone="warning">Test mode: no real payment gateway is connected. Use the buttons below to simulate the gateway response.</Notice>
            <form action={completeMockPayment} className="flex flex-wrap gap-3">
              <input type="hidden" name="paymentCode" value={payment.code} />
              <Button name="outcome" value="success" variant="accent" size="lg"><ShieldCheck className="size-5" /> Simulate successful payment</Button>
              <Button name="outcome" value="fail" variant="secondary" size="lg">Simulate failure</Button>
            </form>
          </>
        )}
        {payment.status === "failed" && (
          <form action={retryMockPayment}>
            <input type="hidden" name="paymentCode" value={payment.code} />
            <Button variant="accent">Retry payment</Button>
          </form>
        )}
        {!["pending", "failed"].includes(payment.status) && <p>Payment status: <strong>{humanize(payment.status)}</strong></p>}
        <Link href="/dashboard/bookings" className={buttonClass("ghost", "sm")}>Go to my bookings</Link>
      </div>
    </BookingShell>
  );
}
