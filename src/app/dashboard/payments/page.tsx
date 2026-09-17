import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase.from("payments").select("code, amount, currency, status, service, refund_status, transaction_id, created_at, travel_bookings(code)").order("created_at", { ascending: false });
  return (
    <>
      <PageHeader title="Payments" />
      <DataTable head={["Payment ID", "Service", "Amount", "Transaction", "Status", "Refund", "Date"]}>
        {(data ?? []).map((p) => {
          const tb = p.travel_bookings as unknown as { code: string } | null;
          return (
            <tr key={p.code}>
              <Td className="font-mono">{p.status === "pending" ? <Link className="text-brand-600" href={`/checkout/${p.code}`}>{p.code}</Link> : p.code}</Td>
              <Td>{humanize(p.service)}{tb && <Link href={`/dashboard/bookings/${tb.code}`} className="block text-xs text-brand-600">{tb.code}</Link>}</Td>
              <Td>{formatMoney(Number(p.amount), p.currency)}</Td>
              <Td className="font-mono text-xs">{p.transaction_id ?? "—"}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td>{p.refund_status === "none" ? "—" : <StatusBadge status={p.refund_status} />}</Td>
              <Td className="text-muted">{formatDate(p.created_at)}</Td>
            </tr>
          );
        })}
        {!data?.length && <tr><Td className="text-muted">No payments yet.</Td></tr>}
      </DataTable>
    </>
  );
}
