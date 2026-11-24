import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import logo from "../../../../../../../../public/Images/logo-cropped.png";
import { PageHeader } from "@/components/crm/blocks";
import { PrintButton } from "@/components/crm/interactive";
import { requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { amountInWords, fmtDate, fmtDateTime, money, titleCase } from "@/lib/crm/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payment receipt" };

export default async function ReceiptPage({ params }: PageProps<"/crm/customers/[id]/receipt/[paymentId]">) {
  await requireCrm("payments.view");
  const { id, paymentId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(paymentId)) notFound();
  const supabase = await createClient();
  const config = await getCrmConfig();
  const [{ data: p }, { data: c }, { data: all }] = await Promise.all([
    supabase.from("crm_payments").select("*, application:crm_applications(code)").eq("id", paymentId).eq("customer_id", id).maybeSingle(),
    supabase.from("crm_customers").select("*").eq("id", id).maybeSingle(),
    supabase.from("crm_payments").select("id, amount, paid_on, created_at").eq("customer_id", id).order("paid_on").order("created_at"),
  ]);
  if (!p || !c) notFound();

  // Balance right after this payment (payments ordered by date, then entry time).
  let paidToDate = 0;
  for (const x of all ?? []) { paidToDate += Number(x.amount); if (x.id === p.id) break; }
  const company = config.company;
  const cur = config.currency;

  return (
    <>
      <div className="print:hidden">
        <PageHeader back={{ href: `/crm/customers/${id}?tab=payments`, label: c.full_name }} title={`Receipt ${p.code}`} actions={<PrintButton />} />
        <p className="-mt-3 mb-4 text-sm text-muted">Use “Print / Save PDF” and choose “Save as PDF” to download.</p>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl border border-line bg-white p-8 shadow-xs print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-brand-600 pb-6">
          <div>
            {company.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={company.logo_url} alt={company.name} className="h-14 w-auto" />
              : <Image src={logo} alt={company.name} height={56} style={{ width: "auto", height: 56 }} />}
            <p className="mt-3 text-lg font-bold">{company.name}</p>
            {company.address && <p className="max-w-xs text-xs text-ink-soft">{company.address}</p>}
            <p className="text-xs text-ink-soft">{[company.phone, company.email, company.website].filter(Boolean).join(" · ")}</p>
            {company.gstin && <p className="text-xs text-ink-soft">GSTIN: {company.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black uppercase tracking-wide text-brand-700">Payment receipt</p>
            <p className="mt-2 text-sm">Receipt no. <b className="font-mono">{p.code}</b></p>
            <p className="text-sm">Date: <b>{fmtDate(p.paid_on)}</b></p>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Received from</p>
            <p className="mt-1 text-lg font-semibold">{c.full_name}</p>
            <p className="text-sm text-ink-soft">Customer ID: <span className="font-mono">{c.code}</span></p>
            {c.mobile && <p className="text-sm text-ink-soft">{c.mobile}</p>}
            {c.email && <p className="text-sm text-ink-soft">{c.email}</p>}
            {c.address && <p className="text-sm text-ink-soft">{c.address}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Towards</p>
            <p className="mt-1 text-sm">{config.label("visa_category", c.visa_category)} — {config.label("destination_country", c.destination_country)}</p>
            {(p.application as { code: string } | null)?.code && <p className="text-sm text-ink-soft">Application {(p.application as { code: string }).code}</p>}
            {c.application_ref && <p className="text-sm text-ink-soft">Ref: {c.application_ref}</p>}
          </div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead><tr className="bg-brand-600 text-left text-white">
            <th className="px-3 py-2">Description</th><th className="px-3 py-2">Mode</th><th className="px-3 py-2">Transaction ref</th><th className="px-3 py-2 text-right">Amount</th>
          </tr></thead>
          <tbody><tr className="border-b border-line">
            <td className="px-3 py-3">{titleCase(p.payment_type)} payment{p.notes ? <span className="block text-xs text-muted">{p.notes}</span> : null}</td>
            <td className="px-3 py-3">{config.label("payment_mode", p.payment_mode)}</td>
            <td className="px-3 py-3 font-mono text-xs">{p.transaction_ref ?? "—"}</td>
            <td className="px-3 py-3 text-right text-base font-bold tabular-nums">{money(p.amount, cur)}</td>
          </tr></tbody>
        </table>
        <p className="mt-3 text-sm"><span className="text-muted">Amount in words:</span> <b>{amountInWords(Number(p.amount), cur)} only</b></p>

        <section className="ml-auto mt-6 w-full max-w-xs space-y-1.5 rounded-xl bg-canvas p-4 text-sm print:bg-transparent print:ring-1 print:ring-line">
          <div className="flex justify-between"><span className="text-muted">Total package</span><span className="tabular-nums">{money(c.package_amount, cur)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Paid to date</span><span className="tabular-nums">{money(paidToDate, cur)}</span></div>
          <div className="flex justify-between border-t border-line pt-1.5 font-bold"><span>Balance due</span><span className="tabular-nums">{money(Math.max(0, Number(c.package_amount) - paidToDate), cur)}</span></div>
        </section>

        <footer className="mt-12 flex flex-wrap items-end justify-between gap-6 text-xs text-muted">
          <p>Received by: {config.staffName(p.received_by)}<br />Generated {fmtDateTime(new Date())}</p>
          <div className="text-center"><div className="mb-1 h-12 w-48 border-b border-ink/40" />Authorised signatory</div>
        </footer>
        <p className="mt-8 text-center text-[11px] text-muted">This is a computer-generated receipt. Visa approval is at the sole discretion of the embassy/consulate; fees are subject to the agreed terms.</p>
      </article>
    </>
  );
}
