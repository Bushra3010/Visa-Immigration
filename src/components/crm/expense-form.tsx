"use client";

import { useState } from "react";
import { CheckCircle2, Pencil, Plus, XCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { istToday } from "@/lib/crm/dates";
import { createExpense, decideExpense, updateExpense } from "@/lib/crm/actions/expenses";
import { CheckboxField, FileField, SelectField, TextAreaField, TextField } from "./fields";
import { ActionButton, CrmForm, Modal } from "./interactive";

type Opt = { value: string; label: string };
export type ExpenseLinkOptions = { customers: Opt[]; leads: Opt[]; applications: (Opt & { customerId: string })[] };
const s = (v: unknown) => (v === null || v === undefined ? null : String(v));

function Fields({ values, categories, modes, links, currency, canApprove, isNew }: {
  values?: Record<string, unknown>; categories: Opt[]; modes: Opt[]; links: ExpenseLinkOptions; currency: string; canApprove: boolean; isNew: boolean;
}) {
  const [customer, setCustomer] = useState(s(values?.customer_id) ?? "");
  const [today] = useState(istToday);
  const apps = links.applications.filter((a) => !customer || a.customerId === customer);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Expense title" name="title" required defaultValue={s(values?.title)} className="sm:col-span-2" />
      <SelectField label="Category" name="category" required options={categories} defaultValue={s(values?.category)} />
      <TextField label={`Amount (${currency})`} name="amount" type="number" min={0.01} step="0.01" required defaultValue={s(values?.amount)} />
      <TextField label="Expense date" name="expense_date" type="date" required defaultValue={s(values?.expense_date) ?? today} max={today} />
      <SelectField label="Payment mode" name="payment_mode" options={modes} defaultValue={s(values?.payment_mode)} />
      <TextField label="Vendor / recipient" name="vendor" defaultValue={s(values?.vendor)} className="sm:col-span-2" />
      <div className="sm:col-span-2 rounded-xl border border-dashed border-line p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Related to (optional)</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Customer</span>
            <select name="customer_id" value={customer} onChange={(e) => setCustomer(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-white px-2 text-sm">
              <option value="">None</option>{links.customers.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <SelectField label="Application" name="application_id" options={apps} defaultValue={s(values?.application_id)} placeholder="None" />
          <SelectField label="Lead" name="lead_id" options={links.leads} defaultValue={s(values?.lead_id)} placeholder="None" />
        </div>
      </div>
      <FileField label={values?.bill_path ? "Replace bill / receipt" : "Bill / receipt"} name="bill" />
      <TextAreaField label="Description" name="description" defaultValue={s(values?.description)} rows={2} />
      {isNew && canApprove && <div className="sm:col-span-2"><CheckboxField name="approve_now" label="Approve immediately (you are an approver)" /></div>}
    </div>
  );
}

export function NewExpense(props: { categories: Opt[]; modes: Opt[]; links: ExpenseLinkOptions; currency: string; canApprove: boolean; defaultCustomer?: string }) {
  return (
    <Modal title="Add expense" description="Business and customer-related costs. Customer payments are recorded separately." trigger={<><Plus className="size-4" />Add expense</>} size="lg">
      <CrmForm action={createExpense} submitLabel="Save expense">
        <Fields {...props} values={props.defaultCustomer ? { customer_id: props.defaultCustomer } : undefined} isNew />
      </CrmForm>
    </Modal>
  );
}

export function EditExpense({ values, ...props }: { values: Record<string, unknown>; categories: Opt[]; modes: Opt[]; links: ExpenseLinkOptions; currency: string; canApprove: boolean }) {
  return (
    <Modal title={`Edit ${values.code}`} trigger={<Pencil className="size-4" />} triggerClassName={buttonClass("ghost", "sm")} size="lg">
      <CrmForm action={updateExpense} submitLabel="Save changes">
        <input type="hidden" name="id" value={String(values.id)} />
        <Fields {...props} values={values} isNew={false} />
      </CrmForm>
    </Modal>
  );
}

export function ExpenseDecision({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex items-center gap-1">
      {status !== "approved" && <ActionButton action={decideExpense} fields={{ id, status: "approved" }} variant="ghost" title="Approve"><CheckCircle2 className="size-4 text-success" /></ActionButton>}
      {status !== "rejected" && (
        <Modal title="Reject expense" trigger={<XCircle className="size-4 text-danger" />} triggerClassName={buttonClass("ghost", "sm")} size="sm">
          <CrmForm action={decideExpense} submitLabel="Reject" variant="danger">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value="rejected" />
            <TextAreaField label="Reason" name="remarks" required rows={3} />
          </CrmForm>
        </Modal>
      )}
    </div>
  );
}
