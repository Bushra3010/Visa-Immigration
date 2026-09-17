"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { idleState } from "@/lib/forms";
import { submitEnquiry } from "@/lib/leads/actions";
import { COUNTRY_OPTIONS } from "@/lib/leads/options";
import { Honeypot } from "./honeypot";
import { SuccessPanel } from "./success-panel";

export function EnquiryForm() {
  const [state, action, pending] = useActionState(submitEnquiry, idleState);
  const err = (k: string) => (state.status === "error" ? state.fieldErrors?.[k] : undefined);

  if (state.status === "success") {
    return <SuccessPanel title="Enquiry received" reference={state.data?.reference} demo={state.data?.demo}><p>Our team will get back to you shortly.</p></SuccessPanel>;
  }

  return (
    <form action={action} className="relative grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2" noValidate>
      <Honeypot />
      {state.status === "error" && state.message && <Notice tone="danger" className="sm:col-span-2">{state.message}</Notice>}
      <Field label="Full name" htmlFor="e-name" required error={err("fullName")}><Input id="e-name" name="fullName" autoComplete="name" /></Field>
      <Field label="Mobile" htmlFor="e-mobile" required error={err("mobile")}><Input id="e-mobile" name="mobile" type="tel" autoComplete="tel" /></Field>
      <Field label="Email" htmlFor="e-email" required error={err("email")}><Input id="e-email" name="email" type="email" autoComplete="email" /></Field>
      <Field label="Interested in (optional)" htmlFor="e-country">
        <Select id="e-country" name="country" defaultValue="">
          <option value="">Any destination</option>
          {COUNTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label="Message" htmlFor="e-message" required error={err("message")} className="sm:col-span-2"><Textarea id="e-message" name="message" rows={4} /></Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Sending…" : "Submit enquiry"}</Button></div>
    </form>
  );
}
