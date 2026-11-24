import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type CrmViewer } from "./auth";
import type { CrmConfig } from "./config";
import type { DateRange } from "./dates";

/**
 * CRM reports. Rows are read through the user's RLS client, so every report
 * only covers records the user may see. PostgREST returns at most 1000 rows
 * per request, so readers page through results.
 */

export type ColType = "text" | "number" | "money" | "date" | "datetime" | "percent";
export type Column = { key: string; label: string; type?: ColType };
export type ReportResult = { columns: Column[]; rows: Record<string, string | number | null>[]; summary: { label: string; value: string | number; type?: ColType }[] };
export type ReportDef = {
  key: string; label: string; group: string; description: string; permissions: string[];
  build: (db: SupabaseClient, range: DateRange, config: CrmConfig, viewer: CrmViewer) => Promise<ReportResult>;
};

type Q = { range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }> };
async function fetchAll<T>(make: () => Q, cap = 50_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < cap; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
const fromIso = (r: DateRange) => r.from.toISOString();
const toIso = (r: DateRange) => r.to.toISOString();
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 330 * 60_000).toISOString().slice(0, 10);

function months(range: DateRange) {
  const out: string[] = [];
  const start = range.key === "all" ? null : range.fromDate.slice(0, 7);
  let [y, m] = range.toDate.slice(0, 7).split("-").map(Number);
  for (let i = 0; i < 36; i++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.unshift(key);
    if (start ? key <= start : i >= 11) break;
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

type LeadRow = { id: string; created_at: string; converted_at: string | null; source: string | null; destination_country: string | null; visa_type: string | null; temperature: string; assigned_counsellor_id: string | null; stage_id: string | null };
async function leadsInRange(db: SupabaseClient, range: DateRange) {
  return fetchAll<LeadRow>(() => db.from("leads").select("id, created_at, converted_at, source, destination_country, visa_type, temperature, assigned_counsellor_id, stage_id").gte("created_at", fromIso(range)).lt("created_at", toIso(range)).order("created_at"));
}

function groupLeads(leads: LeadRow[], key: (l: LeadRow) => string, config: CrmConfig) {
  const m = new Map<string, { leads: number; converted: number; lost: number }>();
  for (const l of leads) {
    const k = key(l);
    const g = m.get(k) ?? { leads: 0, converted: 0, lost: 0 };
    g.leads++;
    if (l.converted_at) g.converted++;
    if (l.stage_id && config.stageById.get(l.stage_id)?.is_lost) g.lost++;
    m.set(k, g);
  }
  return [...m.entries()].sort((a, b) => b[1].leads - a[1].leads);
}

export const REPORTS: ReportDef[] = [
  {
    key: "lead_generation", label: "Lead Generation", group: "Leads", permissions: ["leads.view"],
    description: "New leads per day, split by priority.",
    async build(db, range) {
      const leads = await leadsInRange(db, range);
      const byDay = new Map<string, { hot: number; warm: number; cold: number }>();
      for (const l of leads) {
        const d = istDay(l.created_at);
        const g = byDay.get(d) ?? { hot: 0, warm: 0, cold: 0 };
        g[(l.temperature as "hot") ?? "warm"]++;
        byDay.set(d, g);
      }
      const rows = [...byDay.entries()].sort().map(([date, g]) => ({ date, leads: g.hot + g.warm + g.cold, hot: g.hot, warm: g.warm, cold: g.cold }));
      return {
        columns: [{ key: "date", label: "Date", type: "date" }, { key: "leads", label: "Leads", type: "number" }, { key: "hot", label: "Hot", type: "number" }, { key: "warm", label: "Warm", type: "number" }, { key: "cold", label: "Cold", type: "number" }],
        rows,
        summary: [{ label: "Total leads", value: leads.length, type: "number" }, { label: "Days with leads", value: rows.length, type: "number" }, { label: "Avg per active day", value: rows.length ? Math.round((leads.length / rows.length) * 10) / 10 : 0, type: "number" }],
      };
    },
  },
  {
    key: "lead_conversion", label: "Lead Conversion", group: "Leads", permissions: ["leads.view"],
    description: "Conversion by lead source for leads created in the period.",
    async build(db, range, config) {
      const leads = await leadsInRange(db, range);
      const rows = groupLeads(leads, (l) => l.source ?? "unknown", config).map(([k, g]) => ({ source: config.label("lead_source", k), leads: g.leads, converted: g.converted, lost: g.lost, rate: pct(g.converted, g.leads) }));
      const converted = leads.filter((l) => l.converted_at).length;
      return {
        columns: [{ key: "source", label: "Lead source" }, { key: "leads", label: "Leads", type: "number" }, { key: "converted", label: "Converted", type: "number" }, { key: "lost", label: "Lost / not interested", type: "number" }, { key: "rate", label: "Conversion %", type: "percent" }],
        rows,
        summary: [{ label: "Leads", value: leads.length, type: "number" }, { label: "Converted", value: converted, type: "number" }, { label: "Conversion rate", value: pct(converted, leads.length), type: "percent" }],
      };
    },
  },
  {
    key: "employee_performance", label: "Employee Performance", group: "Team", permissions: ["performance.view"],
    description: "Leads assigned, conversions, follow-ups and collections per employee.",
    async build(db, range, config, viewer) {
      const [leads, fus, pays] = await Promise.all([
        leadsInRange(db, range),
        fetchAll<{ assigned_to: string; status: string; due_at: string; completed_at: string | null }>(() => db.from("crm_follow_ups").select("assigned_to, status, due_at, completed_at").gte("due_at", fromIso(range)).lt("due_at", toIso(range))),
        can(viewer, "finance.view") && can(viewer, "payments.view")
          ? fetchAll<{ amount: number; customer: { consultant_id: string | null } | null }>(() => db.from("crm_payments").select("amount, customer:crm_customers(consultant_id)").gte("paid_on", range.fromDate).lte("paid_on", range.toDate))
          : Promise.resolve(null),
      ]);
      const now = Date.now();
      const rows = config.staff.map((s) => {
        const mine = leads.filter((l) => l.assigned_counsellor_id === s.id);
        const conv = mine.filter((l) => l.converted_at).length;
        const f = fus.filter((x) => x.assigned_to === s.id);
        return {
          employee: s.full_name ?? s.email ?? s.id, role: s.role_name ?? "—", leads: mine.length, converted: conv, rate: pct(conv, mine.length),
          followups: f.length, completed: f.filter((x) => x.status === "completed").length,
          overdue: f.filter((x) => x.status === "pending" && new Date(x.due_at).getTime() < now).length,
          ...(pays ? { revenue: sum(pays.filter((p) => p.customer?.consultant_id === s.id).map((p) => Number(p.amount))) } : {}),
        };
      }).filter((r) => r.leads || r.followups || (r as { revenue?: number }).revenue).sort((a, b) => b.converted - a.converted || b.leads - a.leads);
      return {
        columns: [
          { key: "employee", label: "Employee" }, { key: "role", label: "Role" }, { key: "leads", label: "Leads assigned", type: "number" },
          { key: "converted", label: "Converted", type: "number" }, { key: "rate", label: "Conversion %", type: "percent" },
          { key: "followups", label: "Follow-ups due", type: "number" }, { key: "completed", label: "Completed", type: "number" }, { key: "overdue", label: "Overdue", type: "number" },
          ...(pays ? [{ key: "revenue", label: "Revenue collected", type: "money" as const }] : []),
        ],
        rows,
        summary: [{ label: "Employees with activity", value: rows.length, type: "number" }, { label: "Leads", value: leads.length, type: "number" }],
      };
    },
  },
  {
    key: "country_leads", label: "Country-wise Leads", group: "Leads", permissions: ["leads.view"],
    description: "Leads and conversions by interested destination country.",
    async build(db, range, config) {
      const leads = await leadsInRange(db, range);
      const rows = groupLeads(leads, (l) => l.destination_country ?? "unknown", config).map(([k, g]) => ({ country: config.label("destination_country", k), leads: g.leads, converted: g.converted, rate: pct(g.converted, g.leads), share: pct(g.leads, leads.length) }));
      return {
        columns: [{ key: "country", label: "Country" }, { key: "leads", label: "Leads", type: "number" }, { key: "converted", label: "Converted", type: "number" }, { key: "rate", label: "Conversion %", type: "percent" }, { key: "share", label: "Share of leads %", type: "percent" }],
        rows, summary: [{ label: "Countries", value: rows.length, type: "number" }, { label: "Leads", value: leads.length, type: "number" }],
      };
    },
  },
  {
    key: "visa_category", label: "Visa Category", group: "Leads", permissions: ["leads.view"],
    description: "Leads and conversions by visa category.",
    async build(db, range, config) {
      const leads = await leadsInRange(db, range);
      const rows = groupLeads(leads, (l) => l.visa_type ?? "unknown", config).map(([k, g]) => ({ category: config.label("visa_category", k), leads: g.leads, converted: g.converted, rate: pct(g.converted, g.leads), share: pct(g.leads, leads.length) }));
      return {
        columns: [{ key: "category", label: "Visa category" }, { key: "leads", label: "Leads", type: "number" }, { key: "converted", label: "Converted", type: "number" }, { key: "rate", label: "Conversion %", type: "percent" }, { key: "share", label: "Share %", type: "percent" }],
        rows, summary: [{ label: "Categories", value: rows.length, type: "number" }, { label: "Leads", value: leads.length, type: "number" }],
      };
    },
  },
  {
    key: "converted_customers", label: "Converted Customers", group: "Customers", permissions: ["customers.view"],
    description: "Customers converted in the period with package and balance.",
    async build(db, range, config, viewer) {
      const fin = can(viewer, "finance.view") || can(viewer, "payments.view");
      const data = await fetchAll<Record<string, string | number | null>>(() => db.from("crm_customers").select("code, lead_code, full_name, mobile, visa_category, destination_country, consultant_id, converted_at, package_amount, amount_received, balance, payment_status, application_status").gte("converted_at", fromIso(range)).lt("converted_at", toIso(range)).order("converted_at", { ascending: false }));
      const rows = data.map((c) => ({
        code: c.code, lead: c.lead_code, name: c.full_name, mobile: c.mobile, visa: config.label("visa_category", c.visa_category as string), country: config.label("destination_country", c.destination_country as string),
        consultant: config.staffName(c.consultant_id as string), converted: c.converted_at,
        ...(fin ? { package: Number(c.package_amount), received: Number(c.amount_received), balance: Number(c.balance), payment: c.payment_status } : {}),
        app: c.application_status ? config.label("application_status", c.application_status as string) : "—",
      }));
      return {
        columns: [
          { key: "code", label: "Customer ID" }, { key: "lead", label: "Lead ID" }, { key: "name", label: "Customer" }, { key: "mobile", label: "Mobile" }, { key: "visa", label: "Visa" }, { key: "country", label: "Destination" },
          { key: "consultant", label: "Consultant" }, { key: "converted", label: "Converted", type: "date" },
          ...(fin ? [{ key: "package", label: "Package", type: "money" as const }, { key: "received", label: "Received", type: "money" as const }, { key: "balance", label: "Balance", type: "money" as const }, { key: "payment", label: "Payment status" }] : []),
          { key: "app", label: "Application status" },
        ],
        rows,
        summary: [
          { label: "Customers", value: rows.length, type: "number" },
          ...(fin ? [{ label: "Package value", value: sum(data.map((c) => Number(c.package_amount))), type: "money" as const }, { label: "Received", value: sum(data.map((c) => Number(c.amount_received))), type: "money" as const }] : []),
        ],
      };
    },
  },
  {
    key: "revenue", label: "Revenue", group: "Finance", permissions: ["finance.view", "payments.view"],
    description: "Payments received per month and by payment mode.",
    async build(db, range, config) {
      const pays = await fetchAll<{ amount: number; paid_on: string; payment_mode: string }>(() => db.from("crm_payments").select("amount, paid_on, payment_mode").gte("paid_on", range.fromDate).lte("paid_on", range.toDate));
      const byMonth = new Map<string, { n: number; amt: number }>();
      for (const p of pays) { const k = p.paid_on.slice(0, 7); const g = byMonth.get(k) ?? { n: 0, amt: 0 }; g.n++; g.amt += Number(p.amount); byMonth.set(k, g); }
      const rows = months(range).map((m) => ({ month: m, receipts: byMonth.get(m)?.n ?? 0, revenue: Math.round((byMonth.get(m)?.amt ?? 0) * 100) / 100 }));
      const modes = new Map<string, number>();
      for (const p of pays) modes.set(p.payment_mode, (modes.get(p.payment_mode) ?? 0) + Number(p.amount));
      return {
        columns: [{ key: "month", label: "Month" }, { key: "receipts", label: "Receipts", type: "number" }, { key: "revenue", label: "Revenue", type: "money" }],
        rows,
        summary: [{ label: "Total revenue", value: sum(pays.map((p) => Number(p.amount))), type: "money" }, { label: "Receipts", value: pays.length, type: "number" },
          ...[...modes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => ({ label: config.label("payment_mode", k), value: Math.round(v * 100) / 100, type: "money" as const }))],
      };
    },
  },
  {
    key: "payment_collection", label: "Payment Collection", group: "Finance", permissions: ["payments.view"],
    description: "Every payment received in the period.",
    async build(db, range, config) {
      const pays = await fetchAll<Record<string, unknown>>(() => db.from("crm_payments").select("code, paid_on, payment_type, payment_mode, transaction_ref, amount, received_by, customer:crm_customers(code, full_name)").gte("paid_on", range.fromDate).lte("paid_on", range.toDate).order("paid_on", { ascending: false }));
      const rows = pays.map((p) => {
        const c = p.customer as { code: string; full_name: string } | null;
        return { receipt: p.code as string, date: p.paid_on as string, customer: c ? `${c.full_name} (${c.code})` : "—", type: String(p.payment_type), mode: config.label("payment_mode", p.payment_mode as string), ref: (p.transaction_ref as string) ?? "", amount: Number(p.amount), by: config.staffName(p.received_by as string) };
      });
      return {
        columns: [{ key: "receipt", label: "Receipt #" }, { key: "date", label: "Date", type: "date" }, { key: "customer", label: "Customer" }, { key: "type", label: "Type" }, { key: "mode", label: "Mode" }, { key: "ref", label: "Transaction ref" }, { key: "amount", label: "Amount", type: "money" }, { key: "by", label: "Received by" }],
        rows, summary: [{ label: "Collected", value: sum(rows.map((r) => r.amount)), type: "money" }, { label: "Receipts", value: rows.length, type: "number" }],
      };
    },
  },
  {
    key: "outstanding", label: "Outstanding Payments", group: "Finance", permissions: ["payments.view"],
    description: "Customers with a remaining balance (all time).",
    async build(db, _range, config) {
      const data = await fetchAll<Record<string, unknown>>(() => db.from("crm_customers").select("id, code, full_name, mobile, consultant_id, package_amount, amount_received, balance, converted_at").gt("balance", 0).order("balance", { ascending: false }));
      const last = new Map<string, string>();
      const ids = data.map((c) => c.id as string);
      for (let i = 0; i < ids.length; i += 200) {
        const { data: p } = await db.from("crm_payments").select("customer_id, paid_on").in("customer_id", ids.slice(i, i + 200)).order("paid_on", { ascending: false });
        for (const r of p ?? []) if (!last.has(r.customer_id)) last.set(r.customer_id, r.paid_on);
      }
      const rows = data.map((c) => ({ code: c.code as string, name: c.full_name as string, mobile: (c.mobile as string) ?? "", consultant: config.staffName(c.consultant_id as string), package: Number(c.package_amount), received: Number(c.amount_received), balance: Number(c.balance), last: last.get(c.id as string) ?? null, converted: c.converted_at as string }));
      return {
        columns: [{ key: "code", label: "Customer ID" }, { key: "name", label: "Customer" }, { key: "mobile", label: "Mobile" }, { key: "consultant", label: "Consultant" }, { key: "package", label: "Package", type: "money" }, { key: "received", label: "Received", type: "money" }, { key: "balance", label: "Outstanding", type: "money" }, { key: "last", label: "Last payment", type: "date" }, { key: "converted", label: "Converted", type: "date" }],
        rows, summary: [{ label: "Customers with balance", value: rows.length, type: "number" }, { label: "Total outstanding", value: sum(rows.map((r) => r.balance)), type: "money" }],
      };
    },
  },
  {
    key: "expense", label: "Expense Report", group: "Finance", permissions: ["expenses.view"],
    description: "All expenses in the period with approval status.",
    async build(db, range, config) {
      const data = await fetchAll<Record<string, unknown>>(() => db.from("crm_expenses").select("code, expense_date, title, category, vendor, payment_mode, amount, status, added_by, approved_by, customer:crm_customers(code, full_name)").gte("expense_date", range.fromDate).lte("expense_date", range.toDate).order("expense_date", { ascending: false }));
      const rows = data.map((e) => {
        const c = e.customer as { code: string; full_name: string } | null;
        return { code: e.code as string, date: e.expense_date as string, title: e.title as string, category: config.label("expense_category", e.category as string), vendor: (e.vendor as string) ?? "", mode: e.payment_mode ? config.label("payment_mode", e.payment_mode as string) : "", customer: c ? `${c.full_name} (${c.code})` : "", amount: Number(e.amount), status: String(e.status), by: config.staffName(e.added_by as string), approver: e.approved_by ? config.staffName(e.approved_by as string) : "" };
      });
      const approved = rows.filter((r) => r.status === "approved");
      return {
        columns: [{ key: "code", label: "Expense ID" }, { key: "date", label: "Date", type: "date" }, { key: "title", label: "Title" }, { key: "category", label: "Category" }, { key: "vendor", label: "Vendor" }, { key: "mode", label: "Mode" }, { key: "customer", label: "Customer" }, { key: "amount", label: "Amount", type: "money" }, { key: "status", label: "Status" }, { key: "by", label: "Added by" }, { key: "approver", label: "Decided by" }],
        rows,
        summary: [{ label: "Approved", value: sum(approved.map((r) => r.amount)), type: "money" }, { label: "Pending", value: sum(rows.filter((r) => r.status === "pending").map((r) => r.amount)), type: "money" }, { label: "Rejected", value: sum(rows.filter((r) => r.status === "rejected").map((r) => r.amount)), type: "money" }, { label: "Entries", value: rows.length, type: "number" }],
      };
    },
  },
  {
    key: "expense_category", label: "Expenses by Category", group: "Finance", permissions: ["expenses.view"],
    description: "Approved expenses grouped by category.",
    async build(db, range, config) {
      const data = await fetchAll<{ category: string; amount: number }>(() => db.from("crm_expenses").select("category, amount").eq("status", "approved").gte("expense_date", range.fromDate).lte("expense_date", range.toDate));
      const m = new Map<string, { n: number; amt: number }>();
      for (const e of data) { const g = m.get(e.category) ?? { n: 0, amt: 0 }; g.n++; g.amt += Number(e.amount); m.set(e.category, g); }
      const total = sum(data.map((e) => Number(e.amount)));
      const rows = [...m.entries()].sort((a, b) => b[1].amt - a[1].amt).map(([k, g]) => ({ category: config.label("expense_category", k), entries: g.n, amount: Math.round(g.amt * 100) / 100, share: pct(g.amt, total) }));
      return { columns: [{ key: "category", label: "Category" }, { key: "entries", label: "Entries", type: "number" }, { key: "amount", label: "Amount", type: "money" }, { key: "share", label: "Share %", type: "percent" }], rows, summary: [{ label: "Approved expenses", value: total, type: "money" }] };
    },
  },
  {
    key: "expense_customer", label: "Expenses by Customer", group: "Finance", permissions: ["expenses.view"],
    description: "Approved customer-related expenses against package value.",
    async build(db, range, config, viewer) {
      const data = await fetchAll<{ amount: number; customer_id: string; customer: { code: string; full_name: string; package_amount: number; amount_received: number } | null }>(() => db.from("crm_expenses").select("amount, customer_id, customer:crm_customers(code, full_name, package_amount, amount_received)").eq("status", "approved").not("customer_id", "is", null).gte("expense_date", range.fromDate).lte("expense_date", range.toDate));
      const fin = can(viewer, "finance.view");
      const m = new Map<string, { label: string; n: number; amt: number; received: number }>();
      for (const e of data) {
        const g = m.get(e.customer_id) ?? { label: e.customer ? `${e.customer.full_name} (${e.customer.code})` : "Hidden customer", n: 0, amt: 0, received: Number(e.customer?.amount_received ?? 0) };
        g.n++; g.amt += Number(e.amount); m.set(e.customer_id, g);
      }
      const rows = [...m.values()].sort((a, b) => b.amt - a.amt).map((g) => ({ customer: g.label, entries: g.n, amount: Math.round(g.amt * 100) / 100, ...(fin ? { received: g.received, margin: Math.round((g.received - g.amt) * 100) / 100 } : {}) }));
      void config;
      return {
        columns: [{ key: "customer", label: "Customer" }, { key: "entries", label: "Entries", type: "number" }, { key: "amount", label: "Expenses", type: "money" }, ...(fin ? [{ key: "received", label: "Received from customer", type: "money" as const }, { key: "margin", label: "Margin", type: "money" as const }] : [])],
        rows, summary: [{ label: "Customer expenses", value: sum(rows.map((r) => r.amount)), type: "money" }, { label: "Customers", value: rows.length, type: "number" }],
      };
    },
  },
  {
    key: "expense_monthly", label: "Monthly Expenses", group: "Finance", permissions: ["expenses.view"],
    description: "Approved, pending and rejected expenses per month.",
    async build(db, range) {
      const data = await fetchAll<{ amount: number; expense_date: string; status: string }>(() => db.from("crm_expenses").select("amount, expense_date, status").gte("expense_date", range.fromDate).lte("expense_date", range.toDate));
      const rows = months(range).map((m) => {
        const inM = data.filter((e) => e.expense_date.startsWith(m));
        const by = (s: string) => sum(inM.filter((e) => e.status === s).map((e) => Number(e.amount)));
        return { month: m, approved: by("approved"), pending: by("pending"), rejected: by("rejected"), entries: inM.length };
      });
      return { columns: [{ key: "month", label: "Month" }, { key: "entries", label: "Entries", type: "number" }, { key: "approved", label: "Approved", type: "money" }, { key: "pending", label: "Pending", type: "money" }, { key: "rejected", label: "Rejected", type: "money" }], rows, summary: [{ label: "Approved total", value: sum(rows.map((r) => r.approved)), type: "money" }] };
    },
  },
  {
    key: "profit_loss", label: "Profit & Loss", group: "Finance", permissions: ["finance.view", "payments.view", "expenses.view"],
    description: "Revenue (customer payments) minus approved expenses, per month.",
    async build(db, range) {
      const [pays, exps] = await Promise.all([
        fetchAll<{ amount: number; paid_on: string }>(() => db.from("crm_payments").select("amount, paid_on").gte("paid_on", range.fromDate).lte("paid_on", range.toDate)),
        fetchAll<{ amount: number; expense_date: string }>(() => db.from("crm_expenses").select("amount, expense_date").eq("status", "approved").gte("expense_date", range.fromDate).lte("expense_date", range.toDate)),
      ]);
      const rows = months(range).map((m) => {
        const revenue = sum(pays.filter((p) => p.paid_on.startsWith(m)).map((p) => Number(p.amount)));
        const expenses = sum(exps.filter((e) => e.expense_date.startsWith(m)).map((e) => Number(e.amount)));
        return { month: m, revenue, expenses, profit: Math.round((revenue - expenses) * 100) / 100, margin: pct(revenue - expenses, revenue) };
      });
      const rev = sum(pays.map((p) => Number(p.amount)));
      const exp = sum(exps.map((e) => Number(e.amount)));
      return {
        columns: [{ key: "month", label: "Month" }, { key: "revenue", label: "Revenue", type: "money" }, { key: "expenses", label: "Expenses", type: "money" }, { key: "profit", label: "Net profit", type: "money" }, { key: "margin", label: "Margin %", type: "percent" }],
        rows, summary: [{ label: "Revenue", value: rev, type: "money" }, { label: "Expenses", value: exp, type: "money" }, { label: "Net profit", value: Math.round((rev - exp) * 100) / 100, type: "money" }, { label: "Margin", value: pct(rev - exp, rev), type: "percent" }],
      };
    },
  },
  {
    key: "application_status", label: "Application Status", group: "Applications", permissions: ["applications.view"],
    description: "Visa applications created in the period, by current status and destination.",
    async build(db, range, config) {
      const data = await fetchAll<{ status: string; destination_country: string | null; created_at: string }>(() => db.from("crm_applications").select("status, destination_country, created_at").gte("created_at", fromIso(range)).lt("created_at", toIso(range)));
      const rows = config.options.application_status.map((s) => {
        const inS = data.filter((a) => a.status === s.key);
        const top = new Map<string, number>();
        for (const a of inS) top.set(a.destination_country ?? "—", (top.get(a.destination_country ?? "—") ?? 0) + 1);
        return { status: s.label, applications: inS.length, share: pct(inS.length, data.length), top: [...top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${config.label("destination_country", k)} (${n})`).join(", ") };
      });
      const decided = data.filter((a) => a.status === "approved" || a.status === "rejected");
      return {
        columns: [{ key: "status", label: "Status" }, { key: "applications", label: "Applications", type: "number" }, { key: "share", label: "Share %", type: "percent" }, { key: "top", label: "Top destinations" }],
        rows, summary: [{ label: "Applications", value: data.length, type: "number" }, { label: "Approval rate (decided)", value: pct(data.filter((a) => a.status === "approved").length, decided.length), type: "percent" }],
      };
    },
  },
  {
    key: "follow_up_performance", label: "Follow-up Performance", group: "Team", permissions: ["leads.view"],
    description: "Follow-ups due in the period: completion, on-time rate and misses per employee.",
    async build(db, range, config) {
      const data = await fetchAll<{ assigned_to: string; status: string; due_at: string; completed_at: string | null }>(() => db.from("crm_follow_ups").select("assigned_to, status, due_at, completed_at").gte("due_at", fromIso(range)).lt("due_at", toIso(range)));
      const now = Date.now();
      const m = new Map<string, typeof data>();
      for (const f of data) m.set(f.assigned_to, [...(m.get(f.assigned_to) ?? []), f]);
      const rows = [...m.entries()].map(([id, list]) => {
        const done = list.filter((f) => f.status === "completed");
        const onTime = done.filter((f) => f.completed_at && new Date(f.completed_at).getTime() <= new Date(f.due_at).getTime() + 86_400_000).length;
        return { employee: config.staffName(id), scheduled: list.length, completed: done.length, on_time: onTime, missed: list.filter((f) => f.status === "missed").length, overdue: list.filter((f) => f.status === "pending" && new Date(f.due_at).getTime() < now).length, rate: pct(done.length, list.length) };
      }).sort((a, b) => b.scheduled - a.scheduled);
      return {
        columns: [{ key: "employee", label: "Employee" }, { key: "scheduled", label: "Scheduled", type: "number" }, { key: "completed", label: "Completed", type: "number" }, { key: "on_time", label: "Within 24h of due", type: "number" }, { key: "missed", label: "Missed", type: "number" }, { key: "overdue", label: "Overdue now", type: "number" }, { key: "rate", label: "Completion %", type: "percent" }],
        rows, summary: [{ label: "Follow-ups", value: data.length, type: "number" }, { label: "Completion rate", value: pct(data.filter((f) => f.status === "completed").length, data.length), type: "percent" }],
      };
    },
  },
];

export function reportsFor(viewer: CrmViewer) {
  return REPORTS.filter((r) => r.permissions.every((p) => can(viewer, p)));
}
