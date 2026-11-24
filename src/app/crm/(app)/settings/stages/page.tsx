import type { Metadata } from "next";
import { PageHeader } from "@/components/crm/blocks";
import { StagesManager } from "@/components/crm/settings-forms";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../nav";

export const metadata: Metadata = { title: "Lead stages" };

export default async function StagesPage() {
  const viewer = await requireCrm("settings.view");
  const config = await getCrmConfig();
  const supabase = await createClient();
  const counts = await Promise.all(config.stages.map((s) => supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", s.id)));
  return (
    <>
      <PageHeader title="Lead stages" description="Pipeline columns, their order and colours. Every stage change is recorded in lead history." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav active="stages" />
        <StagesManager editable={can(viewer, "settings.edit")} stages={config.stages.map((s, i) => ({ ...s, leads: counts[i].count ?? 0 }))} />
      </div>
    </>
  );
}
