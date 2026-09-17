import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { DocumentUpload } from "@/components/app/document-upload";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { ViewDocumentButton } from "@/components/app/view-document-button";
import { Card } from "@/components/ui/primitives";
import { DOCUMENT_TYPE_LABEL } from "@/lib/immigration/status";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, doc_type, label, status, updated_at, applications(code), document_remarks(body)")
    .order("updated_at", { ascending: false });
  const docs = data ?? [];
  const needed = docs.filter((d) => ["requested", "reupload_required", "rejected"].includes(d.status));

  return (
    <>
      <PageHeader title="Documents" description="Upload and track the documents for your applications. Files are stored privately and encrypted at rest." />
      {needed.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">Action needed</h2>
          <Card className="divide-y divide-line">
            {needed.map((d) => (
              <div key={d.id} className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{d.label ?? DOCUMENT_TYPE_LABEL.get(d.doc_type)}</p>
                  <StatusBadge status={d.status} />
                </div>
                {(d.document_remarks as { body: string }[]).map((r, i) => <p key={i} className="rounded bg-canvas px-3 py-2 text-sm text-ink-soft">{r.body}</p>)}
                <DocumentUpload documentId={d.id} compact />
              </div>
            ))}
          </Card>
        </section>
      )}
      <section className="mb-8">
        <h2 className="mb-3 font-semibold">Upload a document</h2>
        <Card className="p-4"><DocumentUpload /></Card>
      </section>
      <h2 className="mb-3 font-semibold">All documents</h2>
      <DataTable head={["Document", "Application", "Status", "Updated", ""]}>
        {docs.map((d) => (
          <tr key={d.id}>
            <Td className="font-medium">{d.label ?? DOCUMENT_TYPE_LABEL.get(d.doc_type)}</Td>
            <Td className="font-mono text-xs">{(d.applications as unknown as { code: string } | null)?.code ?? "—"}</Td>
            <Td><StatusBadge status={d.status} /></Td>
            <Td className="text-muted">{formatDate(d.updated_at)}</Td>
            <Td>{!["requested"].includes(d.status) && <ViewDocumentButton documentId={d.id} />}</Td>
          </tr>
        ))}
        {docs.length === 0 && <tr><Td className="text-muted">No documents yet.</Td></tr>}
      </DataTable>
    </>
  );
}
