import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { requireSection } from "@/lib/auth";
import { financialReports, immigrationReports, travelReports, type Table } from "@/lib/reports";
import { canAccess } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

function ReportTables({ tables }: { tables: Table[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {tables.map((t) => (
        <div key={t.title}>
          <h3 className="mb-2 font-medium">{t.title}</h3>
          {t.rows.length ? (
            <DataTable head={Object.keys(t.rows[0]).map(humanize)}>
              {t.rows.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <Td key={j}>{typeof v === "number" ? v.toLocaleString("en-IN") : humanize(String(v))}</Td>)}</tr>)}
            </DataTable>
          ) : <p className="text-sm text-muted">No data yet.</p>}
        </div>
      ))}
    </div>
  );
}

export default async function ReportsPage() {
  const viewer = await requireSection("reports");
  const supabase = await createClient();
  const role = viewer.role;
  const showImm = role === "super_admin" || role === "immigration_admin";
  const showTravel = role === "super_admin" || role === "travel_admin" || role === "finance";
  const showFin = canAccess(role, "payments");

  const [imm, travel, fin] = await Promise.all([
    showImm ? immigrationReports(supabase) : null,
    showTravel ? travelReports(supabase) : null,
    showFin ? financialReports(supabase) : null,
  ]);

  const section = (title: string, key: string, tables: Table[] | null) =>
    tables && (
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <a href={`/api/admin/reports/${key}`} className={buttonClass("secondary", "sm")}>Export CSV</a>
        </div>
        <ReportTables tables={tables} />
      </section>
    );

  return (
    <>
      <PageHeader title="Reports" />
      {section("Immigration", "immigration", imm)}
      {section("Travel", "travel", travel)}
      {section("Financial", "financial", fin)}
    </>
  );
}
