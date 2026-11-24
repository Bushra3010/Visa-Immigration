"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { createLead, updateLead } from "@/lib/crm/actions/leads";
import { CheckboxField, CustomFieldInputs, FormSection, SelectField, TextAreaField, TextField, type CustomFieldDef } from "./fields";
import { CrmForm, useFormResult } from "./interactive";

type Opt = { value: string; label: string };
export type LeadFormOptions = {
  sources: Opt[]; visas: Opt[]; countries: Opt[]; staff: Opt[]; customFields: CustomFieldDef[]; canAssign: boolean; viewerId: string;
};
export type LeadFormValues = Partial<Record<string, string | boolean | null>> & { custom_fields?: Record<string, unknown> | null };

function DuplicateNotice() {
  const state = useFormResult();
  const dupes = (state.data as { duplicates?: { id: string; code: string; name: string }[] } | undefined)?.duplicates;
  if (!dupes?.length) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />Possible duplicate lead</p>
      <ul className="mt-2 list-inside list-disc">
        {dupes.map((d) => <li key={d.id}><Link href={`/crm/leads/${d.id}`} target="_blank" className="font-medium underline">{d.code}</Link> — {d.name}</li>)}
      </ul>
      <div className="mt-3"><CheckboxField name="allow_duplicate" label="This is a different person — save anyway" /></div>
    </div>
  );
}

export function LeadForm({ options, values, mode }: { options: LeadFormOptions; values?: LeadFormValues; mode: "create" | "edit" }) {
  const v = (k: string) => (values?.[k] as string | null | undefined) ?? null;
  const yesNo = values?.passport_available === true ? "yes" : values?.passport_available === false ? "no" : "";
  return (
    <CrmForm action={mode === "create" ? createLead : updateLead} submitLabel={mode === "create" ? "Create lead" : "Save changes"} className="space-y-5">
      {values?.id && <input type="hidden" name="id" value={String(values.id)} />}
      <FormSection title="Personal information">
        <TextField label="Full name" name="full_name" defaultValue={v("full_name")} required autoComplete="off" />
        <TextField label="Mobile number" name="mobile" type="tel" defaultValue={v("mobile")} required placeholder="+91 98xxxxxxxx" />
        <TextField label="WhatsApp number" name="whatsapp" type="tel" defaultValue={v("whatsapp")} hint="Leave blank if same as mobile" />
        <TextField label="Email" name="email" type="email" defaultValue={v("email")} />
        <TextField label="Date of birth" name="date_of_birth" type="date" defaultValue={v("date_of_birth")} />
        <SelectField label="Gender" name="gender" defaultValue={v("gender")} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]} />
        <TextField label="Nationality" name="nationality" defaultValue={v("nationality") ?? (mode === "create" ? "Indian" : null)} />
        <TextField label="Current city" name="current_city" defaultValue={v("current_city")} />
        <TextField label="Current country" name="current_country" defaultValue={v("current_country") ?? (mode === "create" ? "India" : null)} />
      </FormSection>

      <FormSection title="Visa information">
        <SelectField label="Visa type" name="visa_type" defaultValue={v("visa_type")} options={options.visas} />
        <SelectField label="Interested country" name="destination_country" defaultValue={v("destination_country")} options={options.countries} />
        <TextField label="Preferred travel date" name="preferred_travel_date" type="date" defaultValue={v("preferred_travel_date")} />
        <TextField label="Purpose of travel" name="purpose_of_travel" defaultValue={v("purpose_of_travel")} className="sm:col-span-2 lg:col-span-3" />
        <SelectField label="Passport available?" name="passport_available" defaultValue={yesNo} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} placeholder="Not known" />
        <TextField label="Passport number" name="passport_number" defaultValue={v("passport_number")} hint="If available" />
        <TextField label="Passport expiry date" name="passport_expiry" type="date" defaultValue={v("passport_expiry")} />
        <TextAreaField label="Previous visa history" name="previous_visa_history" defaultValue={v("previous_visa_history")} className="sm:col-span-2 lg:col-span-3" rows={2} />
        <TextAreaField label="Visa rejection history" name="visa_rejection_history" defaultValue={v("visa_rejection_history")} className="sm:col-span-2 lg:col-span-3" rows={2} placeholder="Country, year and reason, if any" />
        <TextAreaField label="Education / employment details" name="education_employment" defaultValue={v("education_employment")} className="sm:col-span-2 lg:col-span-3" rows={2} />
        <TextAreaField label="Additional requirements" name="additional_requirements" defaultValue={v("additional_requirements")} className="sm:col-span-2 lg:col-span-3" rows={2} />
      </FormSection>

      <FormSection title="Lead information">
        <SelectField label="Lead source" name="source" defaultValue={v("source") ?? (mode === "create" ? "walk_in" : null)} options={options.sources} required allowEmpty={false} />
        <TextField label="Campaign name" name="campaign_name" defaultValue={v("campaign_name")} />
        <TextField label="Reference" name="reference" defaultValue={v("reference")} hint="Referred by / reference number" />
        {options.canAssign
          ? <SelectField label="Assigned employee" name="assigned_counsellor_id" defaultValue={v("assigned_counsellor_id") ?? (mode === "create" ? options.viewerId : null)} options={options.staff} placeholder="Unassigned (auto-assign)" />
          : <input type="hidden" name="assigned_counsellor_id" value={v("assigned_counsellor_id") ?? ""} />}
        <SelectField label="Lead priority" name="temperature" defaultValue={v("temperature") ?? "warm"} allowEmpty={false} required options={[{ value: "hot", label: "🔥 Hot" }, { value: "warm", label: "Warm" }, { value: "cold", label: "❄ Cold" }]} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Next follow-up date" name="follow_up_date" type="date" defaultValue={v("follow_up_date")} />
          <TextField label="Time" name="follow_up_time" type="time" defaultValue={v("follow_up_time")} />
        </div>
        <CustomFieldInputs fields={options.customFields} values={values?.custom_fields} />
      </FormSection>
      <DuplicateNotice />
    </CrmForm>
  );
}
