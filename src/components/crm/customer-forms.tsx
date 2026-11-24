"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { istToday } from "@/lib/crm/dates";
import { buttonClass } from "@/components/ui/button";
import { createApplication, updateApplication, updateCustomer, addPayment, updatePayment } from "@/lib/crm/actions/customers";
import { CustomFieldInputs, FileField, FormSection, SelectField, TextAreaField, TextField, type CustomFieldDef } from "./fields";
import { CrmForm, Modal } from "./interactive";

type Opt = { value: string; label: string };
type Values = Record<string, unknown>;
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

export function CustomerEditForm({ values, staff, visas, countries, customFields, canEditPackage, currency }: {
  values: Values; staff: Opt[]; visas: Opt[]; countries: Opt[]; customFields: CustomFieldDef[]; canEditPackage: boolean; currency: string;
}) {
  return (
    <Modal title="Edit customer" trigger={<><Pencil className="size-4" />Edit</>} triggerVariant="secondary" size="lg">
      <CrmForm action={updateCustomer} submitLabel="Save customer">
        <input type="hidden" name="id" value={String(values.id)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Customer name" name="full_name" defaultValue={s(values.full_name)} required />
          <TextField label="Email" name="email" type="email" defaultValue={s(values.email)} />
          <TextField label="Mobile" name="mobile" type="tel" defaultValue={s(values.mobile)} />
          <TextField label="WhatsApp" name="whatsapp" type="tel" defaultValue={s(values.whatsapp)} />
          <TextAreaField label="Address" name="address" defaultValue={s(values.address)} className="sm:col-span-2" rows={2} />
          <SelectField label="Visa category" name="visa_category" defaultValue={s(values.visa_category)} options={visas} />
          <SelectField label="Destination country" name="destination_country" defaultValue={s(values.destination_country)} options={countries} />
          <SelectField label="Assigned consultant" name="consultant_id" defaultValue={s(values.consultant_id)} options={staff} placeholder="Unassigned" />
          <TextField label="Application reference no." name="application_ref" defaultValue={s(values.application_ref)} />
          {canEditPackage && <TextField label={`Total package amount (${currency})`} name="package_amount" type="number" min={0} step="0.01" defaultValue={s(values.package_amount)} />}
          <TextAreaField label="Notes" name="notes" defaultValue={s(values.notes)} className="sm:col-span-2" rows={3} />
          <CustomFieldInputs fields={customFields} values={values.custom_fields as Record<string, unknown>} />
        </div>
      </CrmForm>
    </Modal>
  );
}

export function PaymentForm({ customerId, payment, modes, applications, staff, viewerId, currency, balance }: {
  customerId: string; payment?: Values; modes: Opt[]; applications: Opt[]; staff: Opt[]; viewerId: string; currency: string; balance?: number;
}) {
  const [today] = useState(istToday);
  const edit = !!payment;
  return (
    <Modal title={edit ? `Edit payment ${payment.code}` : "Record a payment"} description={!edit && balance !== undefined ? `Outstanding balance: ${new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(balance)}` : undefined}
      trigger={edit ? <Pencil className="size-4" /> : <><Plus className="size-4" />Add payment</>} triggerClassName={edit ? buttonClass("ghost", "sm") : undefined} triggerVariant="primary">
      <CrmForm action={edit ? updatePayment : addPayment} submitLabel={edit ? "Save payment" : "Save & generate receipt"}>
        {edit && <input type="hidden" name="id" value={String(payment.id)} />}
        <input type="hidden" name="customer_id" value={customerId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Payment type" name="payment_type" required allowEmpty={false} defaultValue={s(payment?.payment_type) ?? "advance"} options={[
            { value: "advance", label: "Advance payment" }, { value: "installment", label: "Installment" }, { value: "final", label: "Final payment" }, { value: "other", label: "Other" },
          ]} />
          <TextField label={`Amount (${currency})`} name="amount" type="number" min={0.01} step="0.01" required defaultValue={s(payment?.amount) ?? (balance && balance > 0 ? String(balance) : "")} />
          <TextField label="Payment date" name="paid_on" type="date" required defaultValue={s(payment?.paid_on) ?? today} max={today} />
          <SelectField label="Payment mode" name="payment_mode" required options={modes} defaultValue={s(payment?.payment_mode)} />
          <TextField label="Transaction reference" name="transaction_ref" defaultValue={s(payment?.transaction_ref)} hint="UTR / UPI ref / cheque no." />
          <SelectField label="Received by" name="received_by" defaultValue={s(payment?.received_by) ?? viewerId} options={staff} allowEmpty={false} />
          {applications.length > 0 && <SelectField label="For visa application" name="application_id" defaultValue={s(payment?.application_id)} options={applications} placeholder="General / package" />}
          <FileField label={edit && payment?.proof_path ? "Replace payment proof" : "Payment proof (optional)"} name="proof" />
          <TextAreaField label="Notes" name="notes" defaultValue={s(payment?.notes)} className="sm:col-span-2" rows={2} />
        </div>
      </CrmForm>
    </Modal>
  );
}

export function ApplicationFields({ values, statuses, visas, countries, staff, customFields }: {
  values?: Values; statuses: Opt[]; visas: Opt[]; countries: Opt[]; staff: Opt[]; customFields: CustomFieldDef[];
}) {
  const dt = (v: unknown) => {
    if (!v) return null;
    return new Date(new Date(String(v)).getTime() + 330 * 60_000).toISOString().slice(0, 16);
  };
  return (
    <>
      <FormSection title="Application">
        <SelectField label="Application status" name="status" required allowEmpty={false} defaultValue={s(values?.status) ?? "not_started"} options={statuses} />
        <SelectField label="Visa type" name="visa_type" defaultValue={s(values?.visa_type)} options={visas} />
        <SelectField label="Destination country" name="destination_country" defaultValue={s(values?.destination_country)} options={countries} />
        <SelectField label="Consultant" name="consultant_id" defaultValue={s(values?.consultant_id)} options={staff} placeholder="Customer's consultant" />
        {values?.id ? <TextAreaField label="Note for this update (saved in status history)" name="status_note" className="sm:col-span-2" rows={1} /> : null}
      </FormSection>
      <FormSection title="Passport details">
        <TextField label="Passport number" name="passport_number" defaultValue={s(values?.passport_number)} />
        <TextField label="Issue date" name="passport_issue_date" type="date" defaultValue={s(values?.passport_issue_date)} />
        <TextField label="Expiry date" name="passport_expiry_date" type="date" defaultValue={s(values?.passport_expiry_date)} />
        <TextField label="Place of issue" name="passport_issue_place" defaultValue={s(values?.passport_issue_place)} />
      </FormSection>
      <FormSection title="Embassy & key dates">
        <TextField label="Embassy / consulate / VFS centre" name="embassy_name" defaultValue={s(values?.embassy_name)} />
        <TextField label="Embassy city" name="embassy_city" defaultValue={s(values?.embassy_city)} />
        <TextField label="Embassy reference" name="embassy_reference" defaultValue={s(values?.embassy_reference)} />
        <TextField label="Submission date" name="submission_date" type="date" defaultValue={s(values?.submission_date)} />
        <TextField label="Appointment date & time" name="appointment_at" type="datetime-local" defaultValue={dt(values?.appointment_at)} />
        <TextField label="Biometrics date" name="biometrics_date" type="date" defaultValue={s(values?.biometrics_date)} />
        <TextField label="Interview date & time" name="interview_at" type="datetime-local" defaultValue={dt(values?.interview_at)} />
        <TextField label="Visa decision date" name="decision_date" type="date" defaultValue={s(values?.decision_date)} />
        <TextField label="Visa expiry date" name="visa_expiry_date" type="date" defaultValue={s(values?.visa_expiry_date)} />
      </FormSection>
      <FormSection title="Internal notes">
        <TextAreaField label="Notes" name="notes" defaultValue={s(values?.notes)} className="sm:col-span-2 lg:col-span-3" rows={3} />
        <CustomFieldInputs fields={customFields} values={values?.custom_fields as Record<string, unknown>} />
      </FormSection>
    </>
  );
}

export function NewApplicationModal({ customerId, defaults, ...opts }: {
  customerId: string; defaults: Values; statuses: Opt[]; visas: Opt[]; countries: Opt[]; staff: Opt[]; customFields: CustomFieldDef[];
}) {
  return (
    <Modal title="New visa application" trigger={<><Plus className="size-4" />New application</>} triggerVariant="primary" size="xl">
      <CrmForm action={createApplication} submitLabel="Create application" className="space-y-4">
        <input type="hidden" name="customer_id" value={customerId} />
        <ApplicationFields values={defaults} {...opts} />
      </CrmForm>
    </Modal>
  );
}

export function EditApplicationForm({ values, ...opts }: { values: Values; statuses: Opt[]; visas: Opt[]; countries: Opt[]; staff: Opt[]; customFields: CustomFieldDef[] }) {
  return (
    <CrmForm action={updateApplication} submitLabel="Save application" className="space-y-4">
      <input type="hidden" name="id" value={String(values.id)} />
      <input type="hidden" name="customer_id" value={String(values.customer_id)} />
      <ApplicationFields values={values} {...opts} />
    </CrmForm>
  );
}
