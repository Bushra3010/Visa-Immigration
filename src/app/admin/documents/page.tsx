import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { DocumentReviewRow, type ReviewableDocument } from "@/components/app/document-review";
import { Card, EmptyState } from "@/components/ui/primitives";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Document review" };

export default async function DocumentQueuePage() {
  await requireSection("documents");
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, doc_type, label, status, updated_at, storage_path, document_remarks(body, created_at), applications(code), owner:profiles!documents_user_id_fkey(full_name)")
    .in("status", ["uploaded", "under_review"])
    .order("updated_at", { ascending: true })
    .limit(100);

  return (
    <>
      <PageHeader title="Document review queue" description="Oldest uploads first." />
      {data?.length ? (
        <Card className="divide-y divide-line">
          {data.map((d) => {
            const app = d.applications as unknown as { code: string } | null;
            return (
              <div key={d.id}>
                <p className="px-4 pt-3 text-xs text-muted">
                  {(d.owner as unknown as { full_name: string } | null)?.full_name}
                  {app && <> · <Link href={`/admin/applications/${app.code}`} className="font-mono text-brand-600">{app.code}</Link></>}
                </p>
                <DocumentReviewRow doc={d as unknown as ReviewableDocument} canReview />
              </div>
            );
          })}
        </Card>
      ) : <EmptyState title="Nothing to review" description="New uploads will appear here." />}
    </>
  );
}
