import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { MessageForm } from "@/components/app/account-forms";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: messages }, { data: apps }] = await Promise.all([
    supabase.from("messages").select("id, body, sender_id, created_at, applications(code), sender:profiles!messages_sender_id_fkey(full_name)").order("created_at", { ascending: true }).limit(200),
    supabase.from("applications").select("id, code").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader title="Messages" description="Talk to your counsellor about your application." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ol className="space-y-3">
          {(messages ?? []).map((m) => {
            const mine = m.sender_id === viewer.id;
            return (
              <li key={m.id} className={cn("max-w-xl rounded-xl p-3 text-sm", mine ? "ml-auto bg-brand-600 text-white" : "border border-line bg-white")}>
                <p className={cn("text-xs", mine ? "text-brand-100" : "text-muted")}>
                  {mine ? "You" : (m.sender as unknown as { full_name: string } | null)?.full_name ?? "Counsellor"} · {formatDate(m.created_at, { dateStyle: "medium", timeStyle: "short" })}
                  {(m.applications as unknown as { code: string } | null)?.code && ` · ${(m.applications as unknown as { code: string }).code}`}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              </li>
            );
          })}
          {!messages?.length && <li className="text-sm text-muted">No messages yet.</li>}
        </ol>
        <MessageForm applications={apps ?? []} />
      </div>
    </>
  );
}
