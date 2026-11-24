import { NextResponse, type NextRequest } from "next/server";
import { can, crmAudit, getCrmViewer } from "@/lib/crm/auth";
import { signedUrl } from "@/lib/crm/files";
import { createClient } from "@/lib/supabase/server";

/**
 * Private file access. The row is read through the user's RLS client first —
 * if they can't see the record they can't get the file — then a 60-second
 * signed URL is issued. Every access is audited.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/crm/files/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const viewer = await getCrmViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  let path: string | null = null;
  let name = "file";
  if (kind === "document" && can(viewer, "documents.view")) {
    const { data } = await supabase.from("crm_documents").select("storage_path, file_name").eq("id", id).maybeSingle();
    path = data?.storage_path ?? null;
    name = data?.file_name ?? name;
  } else if (kind === "payment" && can(viewer, "payments.view")) {
    const { data } = await supabase.from("crm_payments").select("proof_path, code").eq("id", id).maybeSingle();
    path = data?.proof_path ?? null;
    name = `${data?.code ?? "payment"}-proof`;
  } else if (kind === "expense" && can(viewer, "expenses.view")) {
    const { data } = await supabase.from("crm_expenses").select("bill_path, code").eq("id", id).maybeSingle();
    path = data?.bill_path ?? null;
    name = `${data?.code ?? "expense"}-bill`;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const download = request.nextUrl.searchParams.get("download") === "1";
  const url = await signedUrl(path, { download: download ? name : false });
  if (!url) return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  await crmAudit(viewer, download ? "file.downloaded" : "file.viewed", kind === "document" ? "documents" : kind === "payment" ? "payments" : "expenses", id);
  return NextResponse.redirect(url, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
