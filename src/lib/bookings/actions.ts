"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notifications";
import { getPaymentGateway } from "@/lib/payments/gateway";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { AIRPORTS_BY_CODE } from "@/lib/travel/places";
import { getFlightProvider, getHotelProvider } from "@/lib/travel/registry";
import { quoteFlight, quoteHotel, type FlightQuote, type HotelQuote } from "@/lib/travel/service";
import { fulfilTravelBooking } from "./fulfilment";
import { contactSchema, guestSchema, travellerSchema, validateTravellers } from "./schemas";

export type StartBookingData = {
  priceChanged?: { flight?: { previous: number; current: number }; hotel?: { previous: number; current: number } };
};

const startSchema = z.object({
  offerId: z.string().min(8).max(4000).optional(),
  expectedFlightTotal: z.coerce.number().positive().optional(),
  rateId: z.string().min(8).max(4000).optional(),
  expectedHotelTotal: z.coerce.number().positive().optional(),
  applicationId: z.uuid().optional(),
  acceptPriceChange: z.literal("yes").optional(),
});

const emptyToUndefined = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v === null || v === "" ? undefined : String(v);
};

/**
 * Creates a pending travel booking + payment and redirects to checkout.
 * Handles flight-only, hotel-only and Flight + Hotel (PRD §7.3).
 */
export async function startTravelBooking(_prev: FormState<StartBookingData>, formData: FormData): Promise<FormState<StartBookingData>> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please log in to continue with your booking." };
  if (!isSupabaseAdminConfigured()) return { status: "error", message: "Online booking is coming soon. Please contact our travel team to book this trip." };
  if (!(await rateLimit("start-booking", 10, 10 * 60_000)).ok) return { status: "error", message: "Too many attempts. Please wait a few minutes." };

  const base = startSchema.safeParse({
    offerId: emptyToUndefined(formData, "offerId"),
    expectedFlightTotal: emptyToUndefined(formData, "expectedFlightTotal"),
    rateId: emptyToUndefined(formData, "rateId"),
    expectedHotelTotal: emptyToUndefined(formData, "expectedHotelTotal"),
    applicationId: emptyToUndefined(formData, "applicationId"),
    acceptPriceChange: emptyToUndefined(formData, "acceptPriceChange"),
  });
  if (!base.success || (!base.data.offerId && !base.data.rateId)) return { status: "error", message: "Invalid booking request." };
  const input = base.data;

  const contact = contactSchema.safeParse({ email: formData.get("email"), mobile: formData.get("mobile") });
  let travellersRaw: unknown;
  try {
    travellersRaw = JSON.parse(String(formData.get("travellers") ?? "[]"));
  } catch {
    return { status: "error", message: "Invalid traveller details." };
  }

  // 1. Fare revalidation / rate recheck immediately before booking.
  const [flightResult, hotelResult] = await Promise.all([
    input.offerId ? quoteFlight(input.offerId) : null,
    input.rateId ? quoteHotel(input.rateId) : null,
  ]);
  if (flightResult && !flightResult.ok) return { status: "error", message: `Flight unavailable: ${flightResult.reason} Please search again.` };
  if (hotelResult && !hotelResult.ok) return { status: "error", message: `Room unavailable: ${hotelResult.reason} Please search again.` };
  const flight: FlightQuote | null = flightResult?.ok ? flightResult.quote : null;
  const hotel: HotelQuote | null = hotelResult?.ok ? hotelResult.quote : null;

  const priceChanged: StartBookingData["priceChanged"] = {};
  if (flight && input.expectedFlightTotal && Math.abs(flight.customerAmount - input.expectedFlightTotal) >= 1) {
    priceChanged.flight = { previous: input.expectedFlightTotal, current: flight.customerAmount };
  }
  if (hotel && input.expectedHotelTotal && Math.abs(hotel.customerAmount - input.expectedHotelTotal) >= 1) {
    priceChanged.hotel = { previous: input.expectedHotelTotal, current: hotel.customerAmount };
  }
  if ((priceChanged.flight || priceChanged.hotel) && !input.acceptPriceChange) {
    return { status: "error", message: "The price has changed since you searched. Please review and confirm the new price.", data: { priceChanged } };
  }

  // 2. Traveller / guest validation.
  const fieldErrors: Record<string, string> = contact.success ? {} : fieldErrorsFrom(contact.error);
  let travellers: (z.infer<typeof travellerSchema> | z.infer<typeof guestSchema>)[] = [];
  if (flight) {
    const firstLeg = flight.offer.slices[0];
    const lastLeg = flight.offer.slices[flight.offer.slices.length - 1];
    const countries = new Set(flight.offer.slices.flatMap((s) => [s.from, s.to]).map((c) => AIRPORTS_BY_CODE.get(c)?.countryCode ?? c));
    const result = validateTravellers(travellersRaw, {
      passengers: flight.offer.passengers,
      travelDate: firstLeg.segments[0].departAt.slice(0, 10),
      lastTravelDate: lastLeg.segments[lastLeg.segments.length - 1].arriveAt.slice(0, 10),
      international: countries.size > 1,
    });
    if (!result.success) Object.assign(fieldErrors, prefix("travellers", fieldErrorsFrom(result.error)));
    else travellers = result.data;
  } else {
    const result = z.array(guestSchema).min(1, "Add the lead guest").max(1).safeParse(travellersRaw);
    if (!result.success) Object.assign(fieldErrors, prefix("travellers", fieldErrorsFrom(result.error)));
    else travellers = result.data;
  }
  if (Object.keys(fieldErrors).length) {
    return { status: "error", message: "Please review the highlighted details.", fieldErrors, data: { priceChanged } };
  }

  const db = createAdminClient();
  if (input.applicationId) {
    const { data: app } = await db.from("applications").select("id").eq("id", input.applicationId).eq("user_id", viewer.id).maybeSingle();
    if (!app) return { status: "error", message: "Linked application not found." };
  }

  // 3. Persist booking (pending payment) and create the payment order.
  const total = (flight?.customerAmount ?? 0) + (hotel?.customerAmount ?? 0);
  const currency = flight?.currency ?? hotel?.currency ?? "INR";
  const { data: tb, error: tbError } = await db
    .from("travel_bookings")
    .insert({
      user_id: viewer.id,
      application_id: input.applicationId ?? null,
      contact_email: contact.data!.email.toLowerCase(),
      contact_mobile: contact.data!.mobile,
      total_amount: total,
      currency,
    })
    .select("id, code")
    .single();
  if (tbError || !tb) {
    console.error("Failed to create travel booking", tbError);
    return { status: "error", message: "Could not start your booking. Please try again." };
  }

  let checkoutUrl: string;
  try {
    if (flight) {
      const { error } = await db.from("flight_bookings").insert({
        travel_booking_id: tb.id,
        supplier: getFlightProvider().id,
        itinerary: { ...flight.offer, supplierOfferId: flight.supplierOfferId },
        travellers,
        supplier_amount: flight.supplierAmount,
        markup_amount: flight.markupAmount,
        customer_amount: flight.customerAmount,
        currency: flight.currency,
      });
      if (error) throw error;
    }
    if (hotel) {
      const leadGuest = travellers[0];
      const { error } = await db.from("hotel_bookings").insert({
        travel_booking_id: tb.id,
        supplier: getHotelProvider().id,
        hotel: { ...hotel.stay.hotel, rate: hotel.rate, rooms: hotel.stay.rooms, supplierRateId: hotel.supplierRateId },
        guests: [leadGuest],
        check_in: hotel.stay.checkIn,
        check_out: hotel.stay.checkOut,
        supplier_amount: hotel.supplierAmount,
        markup_amount: hotel.markupAmount,
        customer_amount: hotel.customerAmount,
        currency: hotel.currency,
      });
      if (error) throw error;
    }

    const service = flight && hotel ? "package" : flight ? "flight" : "hotel";
    const gateway = getPaymentGateway();
    const { data: payment, error: payError } = await db
      .from("payments")
      .insert({ user_id: viewer.id, amount: total, currency, gateway: gateway.id, status: "created", service, travel_booking_id: tb.id, application_id: input.applicationId ?? null })
      .select("id, code")
      .single();
    if (payError || !payment) throw payError;

    const order = await gateway.createOrder({ amount: total, currency, reference: payment.code, customerEmail: contact.data!.email });
    await db.from("payments").update({ gateway_order_id: order.gatewayOrderId, status: "pending" }).eq("id", payment.id);
    checkoutUrl = order.checkoutUrl;
  } catch (err) {
    console.error("Failed to prepare booking", err);
    await db.from("travel_bookings").delete().eq("id", tb.id);
    return { status: "error", message: "Could not start your booking. Please try again." };
  }

  redirect(checkoutUrl);
}

function prefix(p: string, errors: Record<string, string>) {
  return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k ? `${p}.${k}` : p, v]));
}

/** Development-only simulated payment result (PAYMENT_GATEWAY=mock). */
export async function completeMockPayment(formData: FormData) {
  const viewer = await getViewer();
  const paymentCode = String(formData.get("paymentCode") ?? "");
  const outcome = formData.get("outcome") === "fail" ? "failed" : "succeeded";
  if (!viewer) redirect(`/login?next=/checkout/${encodeURIComponent(paymentCode)}`);

  const gateway = getPaymentGateway();
  if (gateway.id !== "mock") throw new Error("Simulated payments are only available with the mock gateway");

  const db = createAdminClient();
  // Atomic transition pending → outcome guards against double submission.
  const { data: payment } = await db
    .from("payments")
    .update({ status: outcome, transaction_id: outcome === "succeeded" ? `mock_txn_${crypto.randomUUID().slice(0, 12)}` : null })
    .eq("code", paymentCode)
    .eq("user_id", viewer.id)
    .eq("status", "pending")
    .select("id, travel_booking_id, amount, currency")
    .maybeSingle();

  if (!payment) {
    const { data: existing } = await db.from("payments").select("status, travel_bookings(code)").eq("code", paymentCode).eq("user_id", viewer.id).maybeSingle();
    const tbCode = (existing?.travel_bookings as unknown as { code: string } | null)?.code;
    if (existing?.status === "succeeded" && tbCode) redirect(`/dashboard/bookings/${tbCode}`);
    redirect(`/checkout/${encodeURIComponent(paymentCode)}?error=invalid`);
  }

  if (outcome === "failed") redirect(`/checkout/${encodeURIComponent(paymentCode)}?error=failed`);

  await notify({ template: "payment_confirmed", email: viewer.email ?? undefined, userId: viewer.id, payload: { paymentCode, amount: payment.amount, currency: payment.currency } });

  let code: string | null = null;
  if (payment.travel_booking_id) {
    await db.from("travel_bookings").update({ status: "payment_received" }).eq("id", payment.travel_booking_id);
    const result = await fulfilTravelBooking(payment.travel_booking_id);
    code = result.code;
  }
  redirect(code ? `/dashboard/bookings/${code}?new=1` : "/dashboard/payments");
}

/** Retry a failed payment by returning the payment to pending. */
export async function retryMockPayment(formData: FormData) {
  const viewer = await getViewer();
  const paymentCode = String(formData.get("paymentCode") ?? "");
  if (!viewer) redirect("/login");
  await createAdminClient().from("payments").update({ status: "pending" }).eq("code", paymentCode).eq("user_id", viewer.id).eq("status", "failed");
  redirect(`/checkout/${encodeURIComponent(paymentCode)}`);
}
