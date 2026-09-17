"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { startTravelBooking, type StartBookingData } from "@/lib/bookings/actions";
import type { FormState } from "@/lib/forms";
import type { Passengers } from "@/lib/travel/types";
import { formatMoney } from "@/lib/utils";

type Props = {
  offerId?: string;
  flightTotal?: number;
  rateId?: string;
  hotelTotal?: number;
  passengers?: Passengers; // present when a flight is included
  international?: boolean;
  applicationId?: string;
  defaultContact?: { email?: string; mobile?: string; firstName?: string; lastName?: string };
  currency: string;
};

type TravellerType = "adult" | "child" | "infant";
type TravellerDraft = Record<string, string> & { type: TravellerType };

const initial: FormState<StartBookingData> = { status: "idle" };

export function BookingForm(props: Props) {
  const [state, action, pending] = useActionState(startTravelBooking, initial);
  const flightMode = Boolean(props.passengers);

  const [travellers, setTravellers] = useState<TravellerDraft[]>(() => {
    if (!props.passengers) return [{ type: "adult", title: "Mr", firstName: props.defaultContact?.firstName ?? "", lastName: props.defaultContact?.lastName ?? "" }];
    const list: TravellerDraft[] = [];
    const push = (type: TravellerType, n: number) => {
      for (let i = 0; i < n; i++) list.push({ type, title: type === "adult" ? "Mr" : "Mstr", gender: "male", nationality: "Indian", passportCountry: props.international ? "India" : "" });
    };
    push("adult", props.passengers.adults);
    push("child", props.passengers.children);
    push("infant", props.passengers.infants);
    if (list[0] && props.defaultContact) {
      list[0].firstName = props.defaultContact.firstName ?? "";
      list[0].lastName = props.defaultContact.lastName ?? "";
    }
    return list;
  });

  const update = (i: number, key: string, value: string) =>
    setTravellers((list) => list.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)));

  const err = (key: string) => (state.status === "error" ? state.fieldErrors?.[key] : undefined);
  const priceChanged = state.status === "error" ? state.data?.priceChanged : undefined;
  const hasPriceChange = Boolean(priceChanged?.flight || priceChanged?.hotel);

  // Guests for hotel-only bookings don't carry flight-only fields.
  const payload = flightMode ? travellers : travellers.map(({ title, firstName, lastName }) => ({ title, firstName, lastName }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="offerId" value={props.offerId ?? ""} />
      <input type="hidden" name="expectedFlightTotal" value={props.flightTotal ?? ""} />
      <input type="hidden" name="rateId" value={props.rateId ?? ""} />
      <input type="hidden" name="expectedHotelTotal" value={props.hotelTotal ?? ""} />
      <input type="hidden" name="applicationId" value={props.applicationId ?? ""} />
      <input type="hidden" name="travellers" value={JSON.stringify(payload)} />
      {hasPriceChange && <input type="hidden" name="acceptPriceChange" value="yes" />}

      {state.status === "error" && state.message && (
        <Notice tone={hasPriceChange ? "warning" : "danger"}>
          <p>{state.message}</p>
          {priceChanged?.flight && <p className="mt-1">Flight: <s>{formatMoney(priceChanged.flight.previous, props.currency)}</s> → <strong>{formatMoney(priceChanged.flight.current, props.currency)}</strong></p>}
          {priceChanged?.hotel && <p className="mt-1">Hotel: <s>{formatMoney(priceChanged.hotel.previous, props.currency)}</s> → <strong>{formatMoney(priceChanged.hotel.current, props.currency)}</strong></p>}
          {err("travellers") && <p className="mt-1">{err("travellers")}</p>}
        </Notice>
      )}

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="text-lg font-semibold">{flightMode ? "Traveller details" : "Lead guest"}</h2>
        {flightMode && <p className="mt-1 text-sm text-muted">Enter names exactly as they appear on the passport.</p>}
        <div className="mt-4 space-y-6">
          {travellers.map((t, i) => {
            const k = (f: string) => `travellers.${i}.${f}`;
            const id = (f: string) => `t${i}-${f}`;
            return (
              <fieldset key={i} className="grid gap-3 border-t border-line pt-4 first:border-0 first:pt-0 sm:grid-cols-6">
                <legend className="mb-2 text-sm font-semibold capitalize text-ink sm:col-span-6">
                  {flightMode ? `${t.type} ${travellers.slice(0, i + 1).filter((x) => x.type === t.type).length}` : "Guest name"}
                </legend>
                <Field label="Title" htmlFor={id("title")} className="sm:col-span-1">
                  <Select id={id("title")} value={t.title} onChange={(e) => update(i, "title", e.target.value)}>
                    {(t.type === "adult" ? ["Mr", "Ms", "Mrs"] : ["Mstr", "Miss"]).map((x) => <option key={x}>{x}</option>)}
                  </Select>
                </Field>
                <Field label="First & middle name" htmlFor={id("firstName")} required error={err(k("firstName"))} className="sm:col-span-2">
                  <Input id={id("firstName")} value={t.firstName ?? ""} onChange={(e) => update(i, "firstName", e.target.value)} aria-invalid={!!err(k("firstName"))} />
                </Field>
                <Field label="Last name" htmlFor={id("lastName")} required error={err(k("lastName"))} className="sm:col-span-3">
                  <Input id={id("lastName")} value={t.lastName ?? ""} onChange={(e) => update(i, "lastName", e.target.value)} aria-invalid={!!err(k("lastName"))} />
                </Field>
                {flightMode && (
                  <>
                    <Field label="Gender" htmlFor={id("gender")} className="sm:col-span-2">
                      <Select id={id("gender")} value={t.gender} onChange={(e) => update(i, "gender", e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Select>
                    </Field>
                    <Field label="Date of birth" htmlFor={id("dob")} required error={err(k("dateOfBirth"))} className="sm:col-span-2">
                      <Input id={id("dob")} type="date" value={t.dateOfBirth ?? ""} onChange={(e) => update(i, "dateOfBirth", e.target.value)} aria-invalid={!!err(k("dateOfBirth"))} />
                    </Field>
                    <Field label="Nationality" htmlFor={id("nat")} required error={err(k("nationality"))} className="sm:col-span-2">
                      <Input id={id("nat")} value={t.nationality ?? ""} onChange={(e) => update(i, "nationality", e.target.value)} />
                    </Field>
                    {props.international && (
                      <>
                        <Field label="Passport number" htmlFor={id("pp")} required error={err(k("passportNumber"))} className="sm:col-span-2">
                          <Input id={id("pp")} value={t.passportNumber ?? ""} autoComplete="off" onChange={(e) => update(i, "passportNumber", e.target.value)} aria-invalid={!!err(k("passportNumber"))} />
                        </Field>
                        <Field label="Passport expiry" htmlFor={id("ppx")} required error={err(k("passportExpiry"))} className="sm:col-span-2">
                          <Input id={id("ppx")} type="date" value={t.passportExpiry ?? ""} onChange={(e) => update(i, "passportExpiry", e.target.value)} aria-invalid={!!err(k("passportExpiry"))} />
                        </Field>
                        <Field label="Issuing country" htmlFor={id("ppc")} required error={err(k("passportCountry"))} className="sm:col-span-2">
                          <Input id={id("ppc")} value={t.passportCountry ?? ""} onChange={(e) => update(i, "passportCountry", e.target.value)} />
                        </Field>
                      </>
                    )}
                  </>
                )}
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Contact details</h2>
        <p className="-mt-2 text-sm text-muted sm:col-span-2">Your {flightMode ? "e-ticket" : "voucher"} and updates will be sent here.</p>
        <Field label="Email" htmlFor="email" required error={err("email")}>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={props.defaultContact?.email} aria-invalid={!!err("email")} />
        </Field>
        <Field label="Mobile" htmlFor="mobile" required error={err("mobile")}>
          <Input id="mobile" name="mobile" type="tel" autoComplete="tel" defaultValue={props.defaultContact?.mobile} aria-invalid={!!err("mobile")} />
        </Field>
      </section>

      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full">
        {pending ? "Checking availability…" : hasPriceChange ? "Accept new price & continue to payment" : "Continue to payment"}
      </Button>
      <p className="text-center text-xs text-muted">We recheck availability and price with the supplier before you pay.</p>
    </form>
  );
}
