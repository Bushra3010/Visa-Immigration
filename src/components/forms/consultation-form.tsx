"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { idleState } from "@/lib/forms";
import { bookConsultation } from "@/lib/leads/actions";
import { COUNTRY_OPTIONS, VISA_TYPE_OPTIONS } from "@/lib/leads/options";
import { todayPlus } from "@/lib/utils";
import { Honeypot } from "./honeypot";
import { SuccessPanel } from "./success-panel";

const TIMES = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export function ConsultationForm({ defaultCountry, defaultVisa }: { defaultCountry?: string; defaultVisa?: string }) {
  const [state, action, pending] = useActionState(bookConsultation, idleState);
  const err = (k: string) => (state.status === "error" ? state.fieldErrors?.[k] : undefined);

  if (state.status === "success") {
    return (
      <SuccessPanel title="Consultation requested" reference={state.data?.reference} demo={state.data?.demo}>
        <p>We&apos;ve sent a confirmation to your email. Your counsellor will confirm the exact time shortly.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/eligibility" className={buttonClass("secondary")}>Complete eligibility assessment</Link>
          <Link href="/" className={buttonClass("ghost")}>Back to home</Link>
        </div>
      </SuccessPanel>
    );
  }

  return (
    <form action={action} className="relative grid gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-2 sm:p-8" noValidate>
      <Honeypot />
      {state.status === "error" && state.message && <Notice tone="danger" className="sm:col-span-2">{state.message}</Notice>}
      <Field label="Full name" htmlFor="fullName" required error={err("fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required aria-invalid={!!err("fullName")} />
      </Field>
      <Field label="Mobile number" htmlFor="mobile" required error={err("mobile")}>
        <Input id="mobile" name="mobile" type="tel" autoComplete="tel" required aria-invalid={!!err("mobile")} />
      </Field>
      <Field label="Email" htmlFor="email" required error={err("email")} className="sm:col-span-2">
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!err("email")} />
      </Field>
      <Field label="Destination country" htmlFor="country" required error={err("country")}>
        <Select id="country" name="country" defaultValue={defaultCountry ?? ""} aria-invalid={!!err("country")}>
          <option value="">Select…</option>
          {COUNTRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label="Visa type" htmlFor="visaType" required error={err("visaType")}>
        <Select id="visaType" name="visaType" defaultValue={defaultVisa ?? ""} aria-invalid={!!err("visaType")}>
          <option value="">Select…</option>
          {VISA_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </Field>
      <Field label="Preferred date" htmlFor="preferredDate" required error={err("preferredDate")}>
        <Input id="preferredDate" name="preferredDate" type="date" min={todayPlus(1)} defaultValue={todayPlus(2)} aria-invalid={!!err("preferredDate")} />
      </Field>
      <Field label="Preferred time (IST)" htmlFor="preferredTime" required error={err("preferredTime")}>
        <Select id="preferredTime" name="preferredTime" defaultValue="11:00">
          {TIMES.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-sm font-medium text-ink">Consultation type <span className="text-danger">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "phone", label: "Phone call" },
            { value: "video", label: "Video call" },
            { value: "office", label: "Office visit" },
          ].map((o, i) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line p-3 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="consultationType" value={o.value} defaultChecked={i === 1} className="accent-brand-600" />
              {o.label}
            </label>
          ))}
        </div>
        {err("consultationType") && <p className="mt-1 text-xs text-danger">{err("consultationType")}</p>}
      </fieldset>
      <Field label="Anything we should know? (optional)" htmlFor="notes" className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={3} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Booking…" : "Book consultation"}
        </Button>
      </div>
    </form>
  );
}
