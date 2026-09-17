import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { financialReports, immigrationReports, toCsv, travelReports, type Row } from "@/lib/reports";
import { canAccess } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/admin/reports/[report]">) {
  const { report } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer || viewer.role === "customer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const role = viewer.role;
  let rows: Row[] = [];

  if (report === "leads" && canAccess(role, "leads")) {
    const { data } = await supabase.from("leads").select("code, full_name, email, mobile, destination_country, visa_type, eligibility_status, source, status, priority, created_at, last_contacted_at, next_follow_up_at").order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  } else if (report === "payments" && canAccess(role, "payments")) {
    const { data } = await supabase.from("payments").select("code, amount, currency, gateway, transaction_id, status, service, refund_status, refunded_amount, created_at").order("created_at", { ascending: false });
    rows = (data ?? []) as Row[];
  } else if (report === "immigration" && (role === "super_admin" || role === "immigration_admin")) {
    rows = (await immigrationReports(supabase)).flatMap((t) => t.rows.map((r) => ({ report: t.title, ...r })));
  } else if (report === "travel" && ["super_admin", "travel_admin", "finance"].includes(role)) {
    rows = (await travelReports(supabase)).flatMap((t) => t.rows.map((r) => ({ report: t.title, ...r })));
  } else if (report === "financial" && canAccess(role, "payments")) {
    rows = (await financialReports(supabase)).flatMap((t) => t.rows.map((r) => ({ report: t.title, ...r })));
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await createAdminClient().from("audit_logs").insert({ actor_id: viewer.id, action: "report.export", entity: "report", entity_id: report });
  // Rows from different tables have different columns; normalise headers.
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const normalised = rows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""])));
  return new NextResponse(toCsv(normalised), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
