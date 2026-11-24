import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, Phone, Printer, Receipt, Trash2 } from "lucide-react";
import { Empty, KV, PageHeader, Panel, StatCard, StatusPill, Table, Tabs, TBody, Td, THead, Th, TintBadge, Tr } from "@/components/crm/blocks";
import { CustomerEditForm, NewApplicationModal, PaymentForm } from "@/components/crm/customer-forms";
import { ConfirmButton } from "@/components/crm/interactive";
import { DocumentUpload, FollowUpForm } from "@/components/crm/record-actions";
import { DocumentList, FollowUpList, staffOptions, type DocumentView, type FollowUpView } from "@/components/crm/records";
import { buttonClass } from "@/components/ui/button";
import { deleteCustomer, deletePayment } from "@/lib/crm/actions/customers";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { fmtDate, fmtDateTime, money } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({ params, searchParams }: PageProps<"/crm/customers/[id]">) {
  const viewer = await requireCrm("customers.view");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const config = await getCrmConfig();
  const { data: c } = await supabase.from("crm_customers").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const fin = can(viewer, "finance.view") || can(viewer, "payments.view");
  const [apps, payments, docs, followUps, expenses] = await Promise.all([
    can(viewer, "applications.view") ? supabase.from("crm_applications").select("id, code, visa_type, destination_country, status, submission_date, appointment_at, decision_date, consultant_id, created_at").eq("customer_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    can(viewer, "payments.view") ? supabase.from("crm_payments").select("*").eq("customer_id", id).order("paid_on", { ascending: false }).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    can(viewer, "documents.view") ? supabase.from("crm_documents").select("id, doc_type, title, file_name, mime_type, size_bytes, status, remarks, uploaded_by, created_at, verified_by, verified_at, application:crm_applications(id, code)").or(`customer_id.eq.${id},lead_id.eq.${c.lead_id}`).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("crm_follow_ups").select("id, title, type, notes, due_at, status, outcome, assigned_to, completed_at, created_by").or(`customer_id.eq.${id},lead_id.eq.${c.lead_id}`).order("due_at", { ascending: false }),
    can(viewer, "expenses.view") ? supabase.from("crm_expenses").select("id, code, title, category, amount, expense_date, status").eq("customer_id", id).order("expense_date", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const tab = typeof sp.tab === "string" ? sp.tab : "overview";
  const staff = staffOptions(config);
  const opts = (kind: "visa_category" | "destination_country" | "document_type" | "payment_mode" | "application_status") => config.options[kind].filter((o) => o.is_active).map((o) => ({ value: o.key, label: o.label }));
  const appOpts = (apps.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${config.label("destination_country", a.destination_country)}` }));
  const customFields = config.customFields.filter((f) => f.entity === "customer");
  const appFields = config.customFields.filter((f) => f.entity === "application");
  const balance = Number(c.balance);

  return (
    <>
      <PageHeader back={{ href: "/crm/customers", label: "Customers" }}
        title={<span className="flex flex-wrap items-center gap-2">{c.full_name}{fin && <StatusPill status={c.payment_status} />}</span>}
        description={<span className="font-mono">{c.code} · Lead <Link className="text-brand-700 hover:underline" href={`/crm/leads/${c.lead_id}`}>{c.lead_code}</Link>{c.application_ref && <> · Ref {c.application_ref}</>}</span>}
        actions={<>
          {c.mobile && <a href={`tel:${c.mobile}`} className={buttonClass("secondary", "sm")}><Phone className="size-4" />Call</a>}
          {can(viewer, "customers.edit") && <CustomerEditForm values={c} staff={staff} visas={opts("visa_category")} countries={opts("destination_country")} customFields={customFields} canEditPackage={can(viewer, "finance.view") || can(viewer, "payments.edit")} currency={config.currency} />}
          {can(viewer, "payments.create") && <PaymentForm customerId={id} modes={opts("payment_mode")} applications={appOpts} staff={staff} viewerId={viewer.id} currency={config.currency} balance={balance} />}
          {can(viewer, "customers.delete") && (
            <ConfirmButton action={deleteCustomer} fields={{ id }} title="Delete customer?" message="Only possible when the customer has no payments or applications. The original lead stays in the pipeline." confirmLabel="Delete" requireReason="Reason (required)"><Trash2 className="size-4" /></ConfirmButton>
          )}
        </>} />

      {fin && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total package" value={money(c.package_amount, config.currency)} tone="brand" />
          <StatCard label="Amount received" value={money(c.amount_received, config.currency)} tone="green" hint={`${(payments.data ?? []).length} payment${(payments.data ?? []).length === 1 ? "" : "s"}`} />
          <StatCard label="Remaining balance" value={<span className={balance > 0 ? "text-danger" : ""}>{money(balance, config.currency)}</span>} tone={balance > 0 ? "red" : "green"} />
          <StatCard label="Application status" value={<span className="text-base">{c.application_status ? config.label("application_status", c.application_status) : "—"}</span>} tone="violet" />
        </div>
      )}

      <Tabs base={`/crm/customers/${id}`} params={sp} active={tab} tabs={[
        { key: "overview", label: "Overview" },
        ...(can(viewer, "payments.view") ? [{ key: "payments", label: "Payments", count: payments.data?.length ?? 0 }] : []),
        ...(can(viewer, "applications.view") ? [{ key: "applications", label: "Visa applications", count: apps.data?.length ?? 0 }] : []),
        ...(can(viewer, "documents.view") ? [{ key: "documents", label: "Documents", count: docs.data?.length ?? 0 }] : []),
        { key: "followups", label: "Follow-ups", count: (followUps.data ?? []).filter((f) => f.status === "pending").length },
        ...(can(viewer, "expenses.view") ? [{ key: "expenses", label: "Expenses", count: expenses.data?.length ?? 0 }] : []),
      ]} />

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Customer details" className="lg:col-span-2">
            <KV items={[
              { label: "Customer ID", value: <span className="font-mono">{c.code}</span> }, { label: "Lead ID", value: <Link href={`/crm/leads/${c.lead_id}`} className="font-mono text-brand-700">{c.lead_code}</Link> },
              { label: "Name", value: c.full_name }, { label: "Mobile", value: c.mobile }, { label: "WhatsApp", value: c.whatsapp }, { label: "Email", value: c.email },
              { label: "Visa category", value: config.label("visa_category", c.visa_category) }, { label: "Destination", value: config.label("destination_country", c.destination_country) },
              { label: "Consultant", value: config.staffName(c.consultant_id) }, { label: "Application ref no.", value: c.application_ref },
              { label: "Conversion date", value: fmtDate(c.converted_at) }, { label: "Address", value: c.address },
              ...customFields.map((f) => ({ label: f.label, value: (() => { const v = (c.custom_fields ?? {})[f.key]; return v === true ? "Yes" : v === false ? "No" : v === undefined ? null : String(v); })() })),
            ]} />
            {c.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-canvas p-3 text-sm">{c.notes}</p>}
          </Panel>
          <Panel title="Applications">
            {(apps.data ?? []).length ? (
              <ul className="space-y-2">{(apps.data ?? []).map((a) => (
                <li key={a.id}><Link href={`/crm/applications/${a.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 hover:bg-canvas">
                  <span><span className="font-mono text-xs text-muted">{a.code}</span><br /><span className="text-sm font-medium">{config.label("destination_country", a.destination_country)}</span></span>
                  <TintBadge color={config.color("application_status", a.status)}>{config.label("application_status", a.status)}</TintBadge>
                </Link></li>
              ))}</ul>
            ) : <p className="text-sm text-muted">No visa applications yet.</p>}
          </Panel>
        </div>
      )}

      {tab === "payments" && (
        <Panel title="Payment history" description="Customer payments only — business expenses are tracked separately." bodyClassName="p-0">
          {(payments.data ?? []).length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-line bg-canvas/70 text-left text-[11px] uppercase tracking-wider text-muted"><tr>
                  <th className="px-4 py-2.5">Receipt</th><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Mode</th><th className="px-4 py-2.5">Transaction ref</th><th className="px-4 py-2.5">Received by</th><th className="px-4 py-2.5 text-right">Amount</th><th className="px-4 py-2.5" />
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {(payments.data ?? []).map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2.5 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-2.5">{fmtDate(p.paid_on)}</td>
                      <td className="px-4 py-2.5"><StatusPill status={p.payment_type} /></td>
                      <td className="px-4 py-2.5">{config.label("payment_mode", p.payment_mode)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{p.transaction_ref ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs">{config.staffName(p.received_by)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{money(p.amount, config.currency)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Link href={`/crm/customers/${id}/receipt/${p.id}`} className={buttonClass("secondary", "sm")} title="Receipt"><Printer className="size-4" />Receipt</Link>
                          {p.proof_path && <a href={`/api/crm/files/payment/${p.id}`} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")} title="Payment proof"><FileDown className="size-4" /></a>}
                          {can(viewer, "payments.edit") && <PaymentForm customerId={id} payment={p} modes={opts("payment_mode")} applications={appOpts} staff={staff} viewerId={viewer.id} currency={config.currency} />}
                          {can(viewer, "payments.delete") && <ConfirmButton action={deletePayment} fields={{ id: p.id }} title={`Delete receipt ${p.code}?`} message="The customer's received amount and balance are recalculated. This is recorded in the audit log." confirmLabel="Delete" requireReason="Reason (required)"><Trash2 className="size-4" /></ConfirmButton>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-line bg-canvas/50 text-sm font-semibold"><tr>
                  <td className="px-4 py-2.5" colSpan={6}>Total received</td><td className="px-4 py-2.5 text-right tabular-nums">{money(c.amount_received, config.currency)}</td><td />
                </tr></tfoot>
              </table>
            </div>
          ) : <Empty title="No payments recorded" description="Record the advance, installments and final payment to track the balance." icon={<Receipt className="size-6" />} />}
        </Panel>
      )}

      {tab === "applications" && (
        <Panel title="Visa applications" action={can(viewer, "applications.create") && (
          <NewApplicationModal customerId={id} statuses={opts("application_status")} visas={opts("visa_category")} countries={opts("destination_country")} staff={staff} customFields={appFields}
            defaults={{ visa_type: c.visa_category, destination_country: c.destination_country, consultant_id: c.consultant_id, status: "not_started" }} />
        )} bodyClassName="p-0">
          {(apps.data ?? []).length ? (
            <Table className="rounded-none border-0 shadow-none" minWidth={720}>
              <THead><Th>Application</Th><Th>Visa / destination</Th><Th>Status</Th><Th>Submitted</Th><Th>Appointment</Th><Th>Decision</Th><Th>Consultant</Th></THead>
              <TBody>{(apps.data ?? []).map((a) => (
                <Tr key={a.id}>
                  <Td><Link href={`/crm/applications/${a.id}`} className="font-mono font-semibold text-brand-700">{a.code}</Link></Td>
                  <Td className="text-xs">{config.label("visa_category", a.visa_type)}<br /><span className="text-muted">{config.label("destination_country", a.destination_country)}</span></Td>
                  <Td><TintBadge color={config.color("application_status", a.status)}>{config.label("application_status", a.status)}</TintBadge></Td>
                  <Td className="text-xs">{fmtDate(a.submission_date)}</Td><Td className="text-xs">{fmtDateTime(a.appointment_at)}</Td><Td className="text-xs">{fmtDate(a.decision_date)}</Td>
                  <Td className="text-xs">{config.staffName(a.consultant_id)}</Td>
                </Tr>
              ))}</TBody>
            </Table>
          ) : <Empty title="No visa applications" description="A customer can have several applications (e.g. family members or multiple countries)." />}
        </Panel>
      )}

      {tab === "documents" && (
        <Panel title="Documents" description="Includes files uploaded while this customer was a lead." action={can(viewer, "documents.create") && <DocumentUpload customerId={id} docTypes={opts("document_type")} applications={appOpts} />} bodyClassName="px-4 py-1 sm:px-5">
          <DocumentList docs={(docs.data ?? []) as unknown as DocumentView[]} config={config} viewer={viewer} />
        </Panel>
      )}

      {tab === "followups" && (
        <div className="space-y-4">
          {can(viewer, "customers.edit") && <Panel title="Schedule a follow-up"><FollowUpForm customerId={id} staff={staff} canAssign={can(viewer, "leads.assign")} viewerId={viewer.id} defaultTitle={`Follow up with ${c.full_name}`} /></Panel>}
          <Panel bodyClassName="px-4 py-1 sm:px-5"><FollowUpList items={(followUps.data ?? []) as FollowUpView[]} config={config} viewer={viewer} /></Panel>
        </div>
      )}

      {tab === "expenses" && (
        <Panel title="Customer-related expenses" description="Embassy fees, documentation charges etc. booked against this customer." action={<Link href={`/crm/expenses?customer=${id}`} className="text-sm font-medium text-brand-700">Open in Expenses</Link>} bodyClassName="p-0">
          {(expenses.data ?? []).length ? (
            <ul className="divide-y divide-line">{(expenses.data ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span><span className="font-mono text-xs text-muted">{e.code}</span> · {e.title}<br /><span className="text-xs text-muted">{config.label("expense_category", e.category)} · {fmtDate(e.expense_date)}</span></span>
                <span className="text-right"><span className="font-semibold tabular-nums">{money(e.amount, config.currency)}</span><br /><StatusPill status={e.status} /></span>
              </li>
            ))}</ul>
          ) : <Empty title="No expenses linked to this customer" />}
        </Panel>
      )}
    </>
  );
}
