"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { canAccess } from "@/lib/roles";
import { notify } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFlightProvider, getHotelProvider } from "@/lib/travel/registry";

/**
 * Cancellation & refund (PRD §8.8): the platform never computes refunds
 * itself — eligibility, fee and refund come from the supplier.
 */

const input = z.object({ kind: z.enum(["flight", "hotel"]), id: z.uuid() });

async function loadForViewer(kind: "flight" | "hotel", id: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = createAdminClient();
  const table = kind === "flight" ? "flight_bookings" : "hotel_bookings";
  const { data } = await db
    .from(table)
    .select("id, supplier, supplier_booking_ref, status, customer_amount, currency, travel_booking_id, travel_bookings!inner(code, user_id, contact_email)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const tb = data.travel_bookings as unknown as { code: string; user_id: string; contact_email: string };
  const isOwner = tb.user_id === viewer.id;
  if (!isOwner && !canAccess(viewer.role, "travel")) return null;
  return { viewer, db, table, booking: data, tb };
}

export type CancellationQuoteResult =
  | { ok: true; eligible: boolean; fee: number; refund: number; currency: string; notes: string[] }
  | { ok: false; message: string };

export async function getCancellationQuote(kind: "flight" | "hotel", id: string): Promise<CancellationQuoteResult> {
  const parsed = input.safeParse({ kind, id });
  if (!parsed.success) return { ok: false, message: "Invalid request" };
  const ctx = await loadForViewer(kind, id);
  if (!ctx) return { ok: false, message: "Booking not found" };
  if (ctx.booking.status !== "confirmed" || !ctx.booking.supplier_booking_ref) return { ok: false, message: "Only confirmed bookings can be cancelled." };

  const provider = kind === "flight" ? getFlightProvider(ctx.booking.supplier) : getHotelProvider(ctx.booking.supplier);
  const quote = await provider.quoteCancellation(ctx.booking.supplier_booking_ref);
  return { ok: true, eligible: quote.eligible, fee: quote.cancellationFee.amount, refund: quote.refundAmount.amount, currency: quote.refundAmount.currency, notes: quote.notes };
}

export async function confirmCancellation(kind: "flight" | "hotel", id: string): Promise<{ ok: boolean; message: string }> {
  const parsed = input.safeParse({ kind, id });
  if (!parsed.success) return { ok: false, message: "Invalid request" };
  const ctx = await loadForViewer(kind, id);
  if (!ctx) return { ok: false, message: "Booking not found" };
  const { db, table, booking, tb, viewer } = ctx;

  // Claim the booking first so concurrent requests can't cancel twice.
  const { data: claimed } = await db.from(table).update({ status: "cancellation_requested" }).eq("id", id).eq("status", "confirmed").select("id").maybeSingle();
  if (!claimed || !booking.supplier_booking_ref) return { ok: false, message: "This booking can't be cancelled right now." };

  const provider = kind === "flight" ? getFlightProvider(booking.supplier) : getHotelProvider(booking.supplier);
  try {
    const quote = await provider.quoteCancellation(booking.supplier_booking_ref);
    if (!quote.eligible) {
      await db.from(table).update({ status: "confirmed" }).eq("id", id);
      return { ok: false, message: "The supplier does not allow cancellation for this booking." };
    }
    const result = await provider.cancel(booking.supplier_booking_ref);
    const cancelled = result.status === "cancelled";
    await db.from(table).update({
      status: cancelled ? "cancelled" : result.status === "pending" ? "cancellation_requested" : "confirmed",
      cancellation: { quote, result, requestedBy: viewer.id, at: new Date().toISOString() },
      refund_status: result.refundAmount.amount > 0 ? "processing" : "none",
    }).eq("id", id);
    await db.from("audit_logs").insert({ actor_id: viewer.id, action: `${kind}_booking.cancel`, entity: table, entity_id: id, changes: { result } });

    // Travel booking is cancelled only when every component is.
    const [{ data: fl }, { data: ho }] = await Promise.all([
      db.from("flight_bookings").select("status").eq("travel_booking_id", booking.travel_booking_id),
      db.from("hotel_bookings").select("status").eq("travel_booking_id", booking.travel_booking_id),
    ]);
    if ([...(fl ?? []), ...(ho ?? [])].every((b) => b.status === "cancelled")) {
      await db.from("travel_bookings").update({ status: "cancelled" }).eq("id", booking.travel_booking_id);
    }

    await notify({ template: "booking_cancelled", email: tb.contact_email, userId: tb.user_id, payload: { reference: tb.code, kind, refund: result.refundAmount } });
    revalidatePath(`/dashboard/bookings/${tb.code}`);
    return { ok: true, message: cancelled ? "Booking cancelled. Any refund will be processed per the supplier's rules." : "Cancellation requested — we'll update you once the supplier confirms." };
  } catch (err) {
    console.error("Cancellation failed", err);
    await db.from(table).update({ status: "confirmed" }).eq("id", id).eq("status", "cancellation_requested");
    return { ok: false, message: "The supplier could not process the cancellation. Please try again or contact support." };
  }
}
