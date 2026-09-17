import "server-only";
import { notify } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlightProvider, getHotelProvider } from "@/lib/travel/registry";
import type { Contact, Traveller } from "@/lib/travel/types";

/**
 * Books with suppliers after payment has succeeded (PRD §7.1/§7.2 flows:
 * Payment → Booking request → PNR / confirmation → saved → notification).
 *
 * Callers must only invoke this after atomically moving the payment to
 * `succeeded`, so a booking is never requested twice for one payment. With a
 * real gateway this runs from the verified payment webhook.
 */
export async function fulfilTravelBooking(travelBookingId: string) {
  const db = createAdminClient();
  const { data: booking, error } = await db
    .from("travel_bookings")
    .select("id, code, user_id, contact_email, contact_mobile, flight_bookings(*), hotel_bookings(*)")
    .eq("id", travelBookingId)
    .single();
  if (error || !booking) throw new Error(`Travel booking ${travelBookingId} not found`);

  await db.from("travel_bookings").update({ status: "booking_requested" }).eq("id", booking.id);
  const contact: Contact = { email: booking.contact_email, mobile: booking.contact_mobile ?? "" };
  let allConfirmed = true;

  for (const fb of booking.flight_bookings ?? []) {
    if (fb.status === "confirmed") continue;
    try {
      const provider = getFlightProvider(fb.supplier);
      const result = await provider.book(fb.itinerary.supplierOfferId, fb.travellers as Traveller[], contact);
      const confirmed = result.ticketStatus !== "failed";
      allConfirmed &&= confirmed;
      await db.from("flight_bookings").update({
        supplier_booking_ref: result.supplierBookingRef,
        pnr: result.pnr,
        ticket_status: result.ticketStatus,
        ticket_numbers: result.ticketNumbers,
        status: confirmed ? "confirmed" : "failed",
        refund_status: confirmed ? "none" : "requested",
      }).eq("id", fb.id);
    } catch (err) {
      allConfirmed = false;
      console.error(`Supplier flight booking failed for ${booking.code}`, err);
      await db.from("flight_bookings").update({ status: "failed", refund_status: "requested" }).eq("id", fb.id);
    }
  }

  for (const hb of booking.hotel_bookings ?? []) {
    if (hb.status === "confirmed") continue;
    try {
      const provider = getHotelProvider(hb.supplier);
      const result = await provider.book(hb.hotel.supplierRateId, hb.guests as Traveller[], contact);
      const confirmed = result.status !== "failed";
      allConfirmed &&= confirmed;
      await db.from("hotel_bookings").update({
        supplier_booking_ref: result.supplierBookingRef,
        confirmation_number: result.confirmationNumber,
        status: confirmed ? "confirmed" : "failed",
        refund_status: confirmed ? "none" : "requested",
      }).eq("id", hb.id);
    } catch (err) {
      allConfirmed = false;
      console.error(`Supplier hotel booking failed for ${booking.code}`, err);
      await db.from("hotel_bookings").update({ status: "failed", refund_status: "requested" }).eq("id", hb.id);
    }
  }

  // A partial failure is surfaced to Travel Admin via refund_status = requested.
  await db.from("travel_bookings").update({ status: allConfirmed ? "confirmed" : "failed" }).eq("id", booking.id);
  await db.from("audit_logs").insert({
    action: allConfirmed ? "booking.confirmed" : "booking.failed",
    entity: "travel_booking",
    entity_id: booking.id,
  });

  await notify({
    template: "booking_confirmed",
    email: booking.contact_email,
    mobile: booking.contact_mobile ?? undefined,
    userId: booking.user_id,
    payload: { reference: booking.code, confirmed: allConfirmed },
  });

  return { code: booking.code, confirmed: allConfirmed };
}
