import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileDown, Trash2 } from "lucide-react";
import { Empty, filterControl, FilterBar, PageHeader, Pagination, SortTh, StatCard, StatusPill, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { EditExpense, ExpenseDecision, NewExpense, type ExpenseLinkOptions } from "@/components/crm/expense-form";
import { AutoSubmit, ConfirmButton, RangePicker } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { deleteExpense } from "@/lib/crm/actions/expenses";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange } from "@/lib/crm/dates";
import { fmtDate, money } from "@/lib/crm/format";
import { searchTerm } from "@/lib/crm/schemas";
import { sumColumns } from "@/lib/crm/sum";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Expenses" };
const PAGE_SIZE = 30;
const SORTS = new Set(["expense_date", "amount", "created_at"]);

export default async function ExpensesPage({ searchParams }: PageProps<"/crm/expenses">) {
  const viewer = await requireCrm("expenses.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const page = Math.max(1, Number(str("page")) || 1);
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "month");
  const config = await getCrmConfig();
  const supabase = await createClient();
  const sort = SORTS.has(str("sort")) ? str("sort") : "expense_date";

  const filtered = (cols: string, opts?: { count: "exact" }) => {
    let q = supabase.from("crm_expenses").select(cols, opts).gte("expense_date", range.fromDate).lte("expense_date", range.toDate);
    if (str("category")) q = q.eq("category", str("category"));
    if (str("status")) q = q.eq("status", str("status"));
    if (str("employee")) q = q.eq("added_by", str("employee") === "me" ? viewer.id : str("employee"));
    if (str("customer")) q = q.eq("customer_id", str("customer"));
    const term = searchTerm(str("q"));
    if (term) q = q.or(`title.ilike.*${term}*,vendor.ilike.*${term}*,code.ilike.*${term}*`);
    return q;
  };

  const [{ data, count }, approved, pending, customers, leads, apps] = await Promise.all([
    filtered("*, customer:crm_customers(id, code, full_name), lead:leads(id, code, full_name), application:crm_applications(id, code)", { count: "exact" })
      .order(sort, { ascending: str("dir") === "asc" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    sumColumns(() => filtered("amount").eq("status", "approved"), ["amount"]),
    sumColumns(() => filtered("amount").eq("status", "pending"), ["amount"]),
    can(viewer, "customers.view") ? supabase.from("crm_customers").select("id, code, full_name").order("converted_at", { ascending: false }).limit(300) : Promise.resolve({ data: [] }),
    can(viewer, "leads.view") ? supabase.from("leads").select("id, code, full_name").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
    can(viewer, "applications.view") ? supabase.from("crm_applications").select("id, code, customer_id, destination_country").order("created_at", { ascending: false }).limit(500) : Promise.resolve({ data: [] }),
  ]);

  const links: ExpenseLinkOptions = {
    customers: (customers.data ?? []).map((c) => ({ value: c.id, label: `${c.full_name} (${c.code})` })),
    leads: (leads.data ?? []).map((l) => ({ value: l.id, label: `${l.full_name} (${l.code})` })),
    applications: (apps.data ?? []).map((a) => ({ value: a.id, label: `${a.code} — ${config.label("destination_country", a.destination_country)}`, customerId: a.customer_id })),
  };
  const cats = config.options.expense_category.filter((o) => o.is_active).map((o) => ({ value: o.key, label: o.label }));
  const modes = config.options.payment_mode.filter((o) => o.is_active).map((o) => ({ value: o.key, label: o.label }));
  const canApprove = can(viewer, "expenses.approve");
  const exportQ = `range=${range.key}&from=${range.fromDate}&to=${range.toDate}`;
  type Row = Record<string, unknown> & { id: string; code: string; title: string; category: string; amount: number; expense_date: string; status: string; added_by: string | null; vendor: string | null; bill_path: string | null; approval_remarks: string | null;
    customer: { id: string; code: string; full_name: string } | null; lead: { id: string; code: string; full_name: string } | null; application: { id: string; code: string } | null };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Expense management" description="Business and customer-related expenses. Only approved expenses count towards profit."
        actions={<>
          {(can(viewer, "expenses.export") || can(viewer, "reports.export")) && <>
            <a href={`/api/crm/reports/expense?${exportQ}`} className={buttonClass("secondary", "sm")}><Download className="size-4" />Excel</a>
            {can(viewer, "reports.view") && <Link href={`/crm/reports?type=expense&${exportQ}`} className={buttonClass("secondary", "sm")}>Reports / PDF</Link>}
          </>}
          {can(viewer, "expenses.create") && <NewExpense categories={cats} modes={modes} links={links} currency={config.currency} canApprove={canApprove} defaultCustomer={str("customer") || undefined} />}
        </>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Approved" value={money(approved.amount, config.currency)} tone="green" hint={range.label} />
        <StatCard label="Pending approval" value={money(pending.amount, config.currency)} tone="amber" href={`/crm/expenses?status=pending&${exportQ}`} />
        <StatCard label="Entries" value={(count ?? 0).toLocaleString("en-IN")} tone="blue" />
      </div>
      <FilterBar action="/crm/expenses">
        <input name="q" defaultValue={str("q")} placeholder="Title, vendor, expense ID" className={`${filterControl} w-full sm:w-52`} aria-label="Search" />
        <AutoSubmit>
          <select name="category" defaultValue={str("category")} className={filterControl} aria-label="Category"><option value="">All categories</option>{config.options.expense_category.map((o) => <option key={o.id} value={o.key}>{o.label}</option>)}</select>
          <select name="status" defaultValue={str("status")} className={filterControl} aria-label="Status"><option value="">Any status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          {viewer.scope !== "own" && <select name="employee" defaultValue={str("employee")} className={filterControl} aria-label="Added by"><option value="">Added by anyone</option><option value="me">Me</option>{config.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
          {links.customers.length > 0 && <select name="customer" defaultValue={str("customer")} className={`${filterControl} max-w-52`} aria-label="Customer"><option value="">All customers</option>{links.customers.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>}
        </AutoSubmit>
        <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
        <button className={buttonClass("primary", "sm")}>Search</button>
      </FilterBar>
      <Table minWidth={1100}>
        <THead>
          <Th>Expense</Th><Th>Category</Th>
          <SortTh label="Date" column="expense_date" base="/crm/expenses" params={sp} />
          <Th>Vendor</Th><Th>Related to</Th><Th>Added by</Th><Th>Status</Th>
          <SortTh label="Amount" column="amount" base="/crm/expenses" params={sp} className="text-right" />
          <Th />
        </THead>
        <TBody>
          {rows.map((e) => {
            const own = e.added_by === viewer.id;
            const editable = (can(viewer, "expenses.edit") && (e.status !== "approved" || canApprove)) && (own || viewer.scope !== "own" || canApprove);
            return (
              <Tr key={e.id}>
                <Td><p className="font-medium">{e.title}</p><p className="font-mono text-xs text-muted">{e.code}</p></Td>
                <Td className="text-xs">{config.label("expense_category", e.category)}</Td>
                <Td className="whitespace-nowrap text-xs">{fmtDate(e.expense_date)}</Td>
                <Td className="text-xs">{e.vendor ?? "—"}</Td>
                <Td className="text-xs">
                  {e.customer && <Link href={`/crm/customers/${e.customer.id}`} className="block text-brand-700 hover:underline">{e.customer.full_name}</Link>}
                  {e.application && <Link href={`/crm/applications/${e.application.id}`} className="block font-mono text-muted">{e.application.code}</Link>}
                  {e.lead && !e.customer && <Link href={`/crm/leads/${e.lead.id}`} className="block text-brand-700 hover:underline">{e.lead.full_name}</Link>}
                  {!e.customer && !e.lead && !e.application && <span className="text-muted">Business</span>}
                </Td>
                <Td className="text-xs">{config.staffName(e.added_by)}</Td>
                <Td><StatusPill status={e.status} />{e.approval_remarks && e.status === "rejected" && <p className="mt-0.5 max-w-40 truncate text-[11px] text-danger" title={e.approval_remarks}>{e.approval_remarks}</p>}</Td>
                <Td className="text-right font-semibold tabular-nums">{money(e.amount, config.currency)}</Td>
                <Td>
                  <div className="flex items-center justify-end gap-0.5">
                    {e.bill_path && <a href={`/api/crm/files/expense/${e.id}`} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")} title="View bill"><FileDown className="size-4" /></a>}
                    {canApprove && <ExpenseDecision id={e.id} status={e.status} />}
                    {editable && <EditExpense values={e} categories={cats} modes={modes} links={links} currency={config.currency} canApprove={canApprove} />}
                    {can(viewer, "expenses.delete") && (e.status !== "approved" || canApprove) && (
                      <ConfirmButton action={deleteExpense} fields={{ id: e.id }} title={`Delete ${e.code}?`} message="The expense and its bill are removed. This is recorded in the audit log." confirmLabel="Delete" requireReason="Reason (required)"><Trash2 className="size-4" /></ConfirmButton>
                    )}
                  </div>
                </Td>
              </Tr>
            );
          })}
          {!rows.length && <tr><td colSpan={9}><Empty title="No expenses in this period" description="Add rent, marketing, embassy fees and other costs to see real profit." /></td></tr>}
        </TBody>
      </Table>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} base="/crm/expenses" params={sp} />
    </>
  );
}
