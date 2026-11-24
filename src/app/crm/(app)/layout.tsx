import { CrmShell } from "@/components/crm/shell";
import { requireCrm } from "@/lib/crm/auth";
import { todayBounds } from "@/lib/crm/dates";
import { createClient } from "@/lib/supabase/server";

export default async function CrmAppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireCrm();
  const supabase = await createClient();
  const { count } = await supabase
    .from("crm_follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("assigned_to", viewer.id)
    .eq("status", "pending")
    .lt("due_at", todayBounds().end.toISOString());
  return <CrmShell viewer={viewer} counts={{ followUps: count ?? 0 }}>{children}</CrmShell>;
}
