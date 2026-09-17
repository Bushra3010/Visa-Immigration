import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/fields";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  await requireSection("payments");
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("id, code, amount, currency, transaction_id, gateway, status, service, refund_status, refunded_amount, created_at, customer:profiles!payments_user_id_fkey(full_name, email), travel_bookings(code), applications(code)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (typeof status === "string" && status) query = query.eq("status", status);
  const { data } = await query;

  return (
    <>
      <PageHeader title="Payments" actions={<a download href="/api/admin/reports/payments" className={buttonClass("secondary", "sm")}>Export CSV</a>} />
      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={typeof status === "string" ? status : ""} className="max-w-xs">
          <option value="">All statuses</option>
          {["created", "pending", "succeeded", "failed", "refunded", "partially_refunded"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </Select>
        <button className={buttonClass("primary")}>Filter</button>
      </form>
      <DataTable head={["Payment ID", "Customer", "Amount", "Transaction ID", "Gateway", "Status", "Related service", "Refund", "Date"]}>
        {(data ?? []).map((p) => {
          const c = p.customer as unknown as { full_name: string; email: string } | null;
          const related = (p.travel_bookings as unknown as { code: string } | null)?.code ?? (p.applications as unknown as { code: string } | null)?.code;
          return (
            <tr key={p.id}>
              <Td className="font-mono text-xs">{p.code}</Td>
              <Td className="text-xs">{c?.full_name}<br /><span className="text-muted">{c?.email}</span></Td>
              <Td>{formatMoney(Number(p.amount), p.currency)}</Td>
              <Td className="font-mono text-xs">{p.transaction_id ?? "—"}</Td>
              <Td className="text-xs">{p.gateway}</Td>
              <Td><StatusBadge status={p.status} /></Td>
              <Td className="text-xs">{humanize(p.service)}{related && <span className="block font-mono text-muted">{related}</span>}</Td>
              <Td className="text-xs">{p.refund_status === "none" ? "—" : <><StatusBadge status={p.refund_status} /><br />{formatMoney(Number(p.refunded_amount), p.currency)}</>}</Td>
              <Td className="text-xs text-muted">{formatDate(p.created_at)}</Td>
            </tr>
          );
        })}
      </DataTable>
    </>
  );
}
