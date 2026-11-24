import type { Metadata } from "next";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, StatCard, StatusPill, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { AutoSubmit, RangePicker } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange } from "@/lib/crm/dates";
import { fmtDate, money } from "@/lib/crm/format";
import { sumColumns } from "@/lib/crm/sum";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Payments" };
const PAGE_SIZE = 30;

export default async function PaymentsPage({ searchParams }: PageProps<"/crm/payments">) {
  const viewer = await requireCrm("payments.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "month");
  const config = await getCrmConfig();
  const supabase = await createClient();

  const filtered = (cols: string, opts?: { count: "exact" }) => {
    let q = supabase.from("crm_payments").select(cols, opts).gte("paid_on", range.fromDate).lte("paid_on", range.toDate);
    if (str("mode")) q = q.eq("payment_mode", str("mode"));
    if (str("type")) q = q.eq("payment_type", str("type"));
    if (str("by")) q = q.eq("received_by", str("by"));
    return q;
  };
  const [{ data, count }, totals] = await Promise.all([
    filtered("id, code, paid_on, payment_type, payment_mode, transaction_ref, amount, received_by, proof_path, customer:crm_customers(id, code, full_name)", { count: "exact" })
      .order("paid_on", { ascending: false }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    sumColumns(() => filtered("amount"), ["amount"]),
  ]);
  const rows = (data ?? []) as unknown as { id: string; code: string; paid_on: string; payment_type: string; payment_mode: string; transaction_ref: string | null; amount: number; received_by: string | null; proof_path: string | null; customer: { id: string; code: string; full_name: string } | null }[];
  const q = `range=${range.key}&from=${range.fromDate}&to=${range.toDate}`;

  return (
    <>
      <PageHeader title="Payments" description="Customer receipts. Record new payments from a customer page."
        actions={(can(viewer, "payments.export") || can(viewer, "reports.export")) && <a href={`/api/crm/reports/payment_collection?${q}`} className={buttonClass("secondary", "sm")}><Download className="size-4" />Export Excel</a>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Collected" value={money(totals.amount, config.currency)} tone="green" hint={range.label} />
        <StatCard label="Receipts" value={(count ?? 0).toLocaleString("en-IN")} tone="blue" />
        <StatCard label="Average receipt" value={money(count ? totals.amount / count : 0, config.currency)} tone="violet" />
      </div>
      <FilterBar action="/crm/payments">
        <AutoSubmit>
          <select name="mode" defaultValue={str("mode")} className={filterControl} aria-label="Mode"><option value="">All modes</option>{config.options.payment_mode.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="type" defaultValue={str("type")} className={filterControl} aria-label="Type"><option value="">All types</option><option value="advance">Advance</option><option value="installment">Installment</option><option value="final">Final</option><option value="other">Other</option></select>
          <select name="by" defaultValue={str("by")} className={filterControl} aria-label="Received by"><option value="">Received by anyone</option>{config.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>
        </AutoSubmit>
        <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
      </FilterBar>
      <Table minWidth={900}>
        <THead><Th>Receipt</Th><Th>Date</Th><Th>Customer</Th><Th>Type</Th><Th>Mode</Th><Th>Transaction ref</Th><Th>Received by</Th><Th className="text-right">Amount</Th><Th /></THead>
        <TBody>
          {rows.map((p) => (
            <Tr key={p.id}>
              <Td className="font-mono text-xs">{p.code}</Td>
              <Td className="whitespace-nowrap">{fmtDate(p.paid_on)}</Td>
              <Td>{p.customer ? <Link href={`/crm/customers/${p.customer.id}?tab=payments`} className="font-medium hover:text-brand-700">{p.customer.full_name}</Link> : "—"}<p className="font-mono text-xs text-muted">{p.customer?.code}</p></Td>
              <Td><StatusPill status={p.payment_type} /></Td>
              <Td className="text-xs">{config.label("payment_mode", p.payment_mode)}</Td>
              <Td className="font-mono text-xs">{p.transaction_ref ?? "—"}</Td>
              <Td className="text-xs">{config.staffName(p.received_by)}</Td>
              <Td className="text-right font-semibold tabular-nums">{money(p.amount, config.currency)}</Td>
              <Td>{p.customer && <Link href={`/crm/customers/${p.customer.id}/receipt/${p.id}`} className={buttonClass("ghost", "sm")} title="Receipt"><Printer className="size-4" /></Link>}</Td>
            </Tr>
          ))}
          {!rows.length && <tr><td colSpan={9}><Empty title="No payments in this period" /></td></tr>}
        </TBody>
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/payments" params={sp} />
    </>
  );
}
