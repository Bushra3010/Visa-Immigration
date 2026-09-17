import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/primitives";
import { markNotificationsRead } from "@/lib/account/actions";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("id, template, payload, read_at, created_at").eq("channel", "in_app").order("created_at", { ascending: false }).limit(100);
  const unread = (data ?? []).some((n) => !n.read_at);
  return (
    <>
      <PageHeader title="Notifications" actions={unread && <form action={markNotificationsRead}><Button variant="secondary" size="sm">Mark all as read</Button></form>} />
      {data?.length ? (
        <Card className="divide-y divide-line">
          {data.map((n) => (
            <div key={n.id} className={cn("flex justify-between gap-4 p-4 text-sm", !n.read_at && "bg-brand-50/50")}>
              <div>
                <p className="font-medium">{humanize(n.template)}</p>
                {typeof n.payload?.reference === "string" && <p className="text-muted">Ref {n.payload.reference}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted">{formatDate(n.created_at, { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
          ))}
        </Card>
      ) : <EmptyState title="You're all caught up" />}
    </>
  );
}
