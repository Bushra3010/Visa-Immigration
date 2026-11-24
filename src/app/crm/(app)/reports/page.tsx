import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Empty, PageHeader, Panel, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { PrintButton, RangePicker } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { RANGE_PRESETS, resolveRange } from "@/lib/crm/dates";
import { fmtDate, fmtDateTime, money } from "@/lib/crm/format";
import { reportsFor, type ColType, type ReportResult } from "@/lib/crm/reports";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

function fmt(v: unknown, type: ColType | undefined, currency: string) {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "money") return money(Number(v), currency);
  if (type === "percent") return `${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
  if (type === "number") return Number(v).toLocaleString("en-IN");
  if (type === "date") return fmtDate(String(v));
  if (type === "datetime") return fmtDateTime(String(v));
  return String(v).replace(/_/g, " ");
}

export default async function ReportsPage({ searchParams }: PageProps<"/crm/reports">) {
  const viewer = await requireCrm("reports.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const available = reportsFor(viewer);
  const def = available.find((r) => r.key === str("type")) ?? available[0];
  const range = resolveRange({ range: str("range"), from: str("from"), to: str("to") }, "30d");
  const config = await getCrmConfig();

  let result: ReportResult | null = null;
  let failed = false;
  if (def) {
    try {
      result = await def.build(await createClient(), range, config, viewer);
    } catch (err) {
      console.error("Report failed", err);
      failed = true;
    }
  }
  const groups = [...new Set(available.map((r) => r.group))];
  const q = `range=${range.key}&from=${range.fromDate}&to=${range.toDate}`;
  const canExport = can(viewer, "reports.export");

  return (
    <>
      <PageHeader title="Reports & analytics" description="Every figure is calculated live from CRM records you have access to."
        actions={def && <>
          {canExport && <a href={`/api/crm/reports/${def.key}?${q}`} className={buttonClass("secondary", "sm")}><FileSpreadsheet className="size-4" />Excel</a>}
          {canExport && <a href={`/api/crm/reports/${def.key}?${q}&format=csv`} className={buttonClass("secondary", "sm")}>CSV</a>}
          <PrintButton><span className="inline-flex items-center gap-2"><FileText className="size-4" />PDF / Print</span></PrintButton>
        </>} />
      {!def ? <Panel><Empty title="No reports available for your role" /></Panel> : (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <nav aria-label="Reports" className="space-y-4 print:hidden">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-muted">{g}</p>
                <ul className="space-y-0.5">
                  {available.filter((r) => r.group === g).map((r) => (
                    <li key={r.key}><Link href={`/crm/reports?type=${r.key}&${q}`} aria-current={r.key === def.key ? "page" : undefined}
                      className={cn("block rounded-lg px-2.5 py-1.5 text-sm", r.key === def.key ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-soft hover:bg-white")}>{r.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs print:border-0 print:p-0 print:shadow-none">
              <div>
                <h2 className="text-lg font-bold">{def.label} report</h2>
                <p className="text-sm text-muted">{def.description}</p>
                <p className="mt-1 hidden text-xs text-muted print:block">{config.company.name} · {range.key === "all" ? "All time" : `${fmtDate(range.fromDate)} – ${fmtDate(range.toDate)}`} · generated {fmtDateTime(new Date())} by {viewer.fullName}</p>
              </div>
              <form className="print:hidden">
                <input type="hidden" name="type" value={def.key} />
                <RangePicker value={range.key} from={range.fromDate} to={range.toDate} presets={RANGE_PRESETS} />
              </form>
            </div>
            {failed && <Panel><Empty title="This report couldn't be generated" description="Please try again. If it keeps failing, narrow the date range." /></Panel>}
            {result && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {result.summary.map((s) => (
                    <div key={s.label} className="rounded-2xl border border-line bg-white p-4 shadow-xs">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.label}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">{fmt(s.value, s.type, config.currency)}</p>
                    </div>
                  ))}
                </div>
                <Table minWidth={Math.max(560, result.columns.length * 120)}>
                  <THead>{result.columns.map((c) => <Th key={c.key} className={c.type && ["number", "money", "percent"].includes(c.type) ? "text-right" : ""}>{c.label}</Th>)}</THead>
                  <TBody>
                    {result.rows.slice(0, 1000).map((r, i) => (
                      <Tr key={i}>{result!.columns.map((c) => <Td key={c.key} className={cn("text-sm", c.type && ["number", "money", "percent"].includes(c.type) && "text-right tabular-nums", c.key === "code" && "font-mono text-xs")}>{fmt(r[c.key], c.type, config.currency)}</Td>)}</Tr>
                    ))}
                    {!result.rows.length && <tr><td colSpan={result.columns.length}><Empty title="No data for this period" description="Try a wider date range." /></td></tr>}
                  </TBody>
                </Table>
                {result.rows.length > 1000 && <p className="text-sm text-muted">Showing the first 1,000 of {result.rows.length.toLocaleString("en-IN")} rows — export to Excel for the full report.</p>}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
