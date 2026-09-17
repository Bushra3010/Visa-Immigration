"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { Notice } from "@/components/ui/primitives";
import { fieldErrorsFrom, idleState } from "@/lib/forms";
import { submitEligibility } from "@/lib/leads/actions";
import {
  COUNTRY_OPTIONS, FUNDS_OPTIONS, INCOME_OPTIONS, LANGUAGE_TEST_OPTIONS, OBJECTIVE_OPTIONS, QUALIFICATION_OPTIONS,
} from "@/lib/leads/options";
import { ELIGIBILITY_STEP_ORDER, eligibilitySteps, type EligibilityStepKey } from "@/lib/leads/schemas";
import { cn } from "@/lib/utils";
import { Honeypot } from "./honeypot";
import { SuccessPanel } from "./success-panel";

const STEP_TITLES: Record<EligibilityStepKey, string> = {
  personal: "Personal information",
  destination: "Destination",
  education: "Education",
  work: "Work experience",
  language: "Language",
  financial: "Financial information",
  consent: "Review & submit",
};

type Values = Record<EligibilityStepKey, Record<string, string>>;

const emptyValues = (defaults: { country?: string; objective?: string }): Values => ({
  personal: {},
  destination: { preferredCountry: defaults.country ?? "", objective: defaults.objective ?? "" },
  education: {},
  work: {},
  language: { testType: "none" },
  financial: {},
  consent: {},
});

export function EligibilityForm({ defaultCountry, defaultObjective }: { defaultCountry?: string; defaultObjective?: string }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(() => emptyValues({ country: defaultCountry, objective: defaultObjective }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, formAction, pending] = useActionState(submitEligibility, idleState);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // If the server rejects a field from an earlier step, jump back to that step.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    const firstBad = ELIGIBILITY_STEP_ORDER.findIndex((k) => Object.keys(state.fieldErrors ?? {}).some((f) => f.startsWith(`${k}.`)));
    if (firstBad >= 0 && firstBad !== step) setStep(firstBad);
  }

  const key = ELIGIBILITY_STEP_ORDER[step];
  const isLast = step === ELIGIBILITY_STEP_ORDER.length - 1;

  if (state.status === "success") {
    return (
      <SuccessPanel title="Thank you — your assessment is submitted" reference={state.data?.reference} demo={state.data?.demo}>
        <p>A counsellor will review your profile and contact you shortly. You can speed things up by booking a consultation now.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/consultation?country=${values.destination.preferredCountry}`} className={buttonClass("accent")}>Book consultation</Link>
          <Link href="/register" className={buttonClass("secondary")}>Create account to track progress</Link>
        </div>
      </SuccessPanel>
    );
  }

  const set = (name: string, value: string) =>
    setValues((v) => ({ ...v, [key]: { ...v[key], [name]: value } }));

  function validateStep() {
    const result = eligibilitySteps[key].safeParse(values[key]);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(fieldErrorsFrom(result.error));
    return false;
  }

  function goTo(next: number) {
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  // Server-side errors are keyed "step.field"; map the current step's back.
  const serverErrors = state.status === "error" ? state.fieldErrors ?? {} : {};
  const errorFor = (name: string) => errors[name] ?? serverErrors[`${key}.${name}`];

  const text = (name: string, label: string, opts: { type?: string; required?: boolean; hint?: string; placeholder?: string; autoComplete?: string } = {}) => (
    <Field label={label} htmlFor={name} required={opts.required} error={errorFor(name)} hint={opts.hint}>
      <Input
        id={name}
        name={name}
        type={opts.type ?? "text"}
        value={values[key][name] ?? ""}
        placeholder={opts.placeholder}
        autoComplete={opts.autoComplete}
        aria-invalid={Boolean(errorFor(name))}
        onChange={(e) => set(name, e.target.value)}
      />
    </Field>
  );

  const select = (name: string, label: string, options: { value: string; label: string }[], required = false) => (
    <Field label={label} htmlFor={name} required={required} error={errorFor(name)}>
      <Select id={name} name={name} value={values[key][name] ?? ""} aria-invalid={Boolean(errorFor(name))} onChange={(e) => set(name, e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <ol className="hidden space-y-1 lg:block" aria-label="Progress">
        {ELIGIBILITY_STEP_ORDER.map((k, i) => (
          <li key={k} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", i === step ? "bg-brand-50 font-medium text-brand-700" : "text-muted")} aria-current={i === step ? "step" : undefined}>
            <span className={cn("grid size-6 place-items-center rounded-full text-xs", i < step ? "bg-brand-600 text-white" : i === step ? "bg-white ring-2 ring-brand-500" : "bg-canvas ring-1 ring-line")}>
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            {STEP_TITLES[k]}
          </li>
        ))}
      </ol>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!isLast) {
            e.preventDefault();
            if (validateStep()) goTo(step + 1);
          } else if (!validateStep()) {
            e.preventDefault();
          }
        }}
        className="relative rounded-2xl border border-line bg-white p-6 sm:p-8"
        noValidate
      >
        <Honeypot />
        <input type="hidden" name="payload" value={JSON.stringify(values)} />
        <p className="text-sm text-muted">Step {step + 1} of {ELIGIBILITY_STEP_ORDER.length}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((step + 1) / ELIGIBILITY_STEP_ORDER.length) * 100}%` }} />
        </div>
        <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-xl font-semibold text-ink outline-none">{STEP_TITLES[key]}</h2>

        {state.status === "error" && state.message && <Notice tone="danger" className="mt-4">{state.message}</Notice>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {key === "personal" && (
            <>
              {text("fullName", "Full name", { required: true, autoComplete: "name" })}
              {text("email", "Email", { type: "email", required: true, autoComplete: "email" })}
              {text("mobile", "Mobile number", { type: "tel", required: true, autoComplete: "tel", placeholder: "+91 98765 43210" })}
              {text("dateOfBirth", "Date of birth", { type: "date", required: true, autoComplete: "bday" })}
              {text("countryOfResidence", "Country of residence", { required: true, autoComplete: "country-name", placeholder: "India" })}
            </>
          )}
          {key === "destination" && (
            <>
              {select("preferredCountry", "Preferred country", COUNTRY_OPTIONS, true)}
              {text("preferredCity", "Preferred city (optional)")}
              {select("objective", "Immigration objective", OBJECTIVE_OPTIONS, true)}
            </>
          )}
          {key === "education" && (
            <>
              {select("highestQualification", "Highest qualification", QUALIFICATION_OPTIONS, true)}
              {text("institution", "University / college")}
              {text("fieldOfStudy", "Field of study")}
              {text("graduationYear", "Graduation year", { type: "number" })}
            </>
          )}
          {key === "work" && (
            <>
              {text("currentOccupation", "Current occupation")}
              {text("totalExperienceYears", "Total experience (years)", { type: "number" })}
              {text("industry", "Industry")}
              {text("currentEmployer", "Current employer")}
              {text("jobPosition", "Job position")}
            </>
          )}
          {key === "language" && (
            <>
              {select("testType", "Language test", LANGUAGE_TEST_OPTIONS, true)}
              {values.language.testType !== "none" && (
                <>
                  {text("overallScore", "Overall score", { type: "number" })}
                  <fieldset className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-4">
                    <legend className="mb-2 text-sm font-medium text-ink">Individual scores</legend>
                    {text("listening", "Listening", { type: "number" })}
                    {text("reading", "Reading", { type: "number" })}
                    {text("writing", "Writing", { type: "number" })}
                    {text("speaking", "Speaking", { type: "number" })}
                  </fieldset>
                </>
              )}
            </>
          )}
          {key === "financial" && (
            <>
              {select("annualIncome", "Approximate annual income", INCOME_OPTIONS, true)}
              {select("availableFunds", "Available funds", FUNDS_OPTIONS, true)}
              <Field label="Sponsorship information (optional)" htmlFor="sponsorship" className="sm:col-span-2" hint="E.g. parents or employer sponsoring your studies or move.">
                <Textarea id="sponsorship" rows={3} value={values.financial.sponsorship ?? ""} onChange={(e) => set("sponsorship", e.target.value)} />
              </Field>
            </>
          )}
          {key === "consent" && (
            <div className="space-y-4 sm:col-span-2">
              <dl className="grid gap-2 rounded-xl bg-canvas p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Name</dt><dd className="font-medium">{values.personal.fullName}</dd></div>
                <div><dt className="text-muted">Email</dt><dd className="font-medium">{values.personal.email}</dd></div>
                <div><dt className="text-muted">Destination</dt><dd className="font-medium">{COUNTRY_OPTIONS.find((c) => c.value === values.destination.preferredCountry)?.label}</dd></div>
                <div><dt className="text-muted">Objective</dt><dd className="font-medium">{OBJECTIVE_OPTIONS.find((o) => o.value === values.destination.objective)?.label}</dd></div>
              </dl>
              <label className="flex gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-brand-600"
                  checked={values.consent.consent === "on"}
                  onChange={(e) => set("consent", e.target.checked ? "on" : "")}
                  aria-invalid={Boolean(errorFor("consent"))}
                />
                <span>
                  I agree that my details may be used to assess my eligibility and contact me about immigration services. I understand this assessment is indicative and not a visa decision.
                </span>
              </label>
              {errorFor("consent") && <p className="text-xs text-danger">{errorFor("consent")}</p>}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0 || pending}>Back</Button>
          <Button type="submit" variant={isLast ? "accent" : "primary"} disabled={pending}>
            {isLast ? (pending ? "Submitting…" : "Submit assessment") : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
