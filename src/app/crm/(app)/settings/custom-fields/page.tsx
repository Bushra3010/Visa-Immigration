import type { Metadata } from "next";
import { PageHeader } from "@/components/crm/blocks";
import { CustomFieldsManager } from "@/components/crm/settings-forms";
import { can, requireCrm } from "@/lib/crm/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "../nav";

export const metadata: Metadata = { title: "Custom fields" };

export default async function CustomFieldsPage() {
  const viewer = await requireCrm("settings.view");
  const supabase = await createClient();
  const { data } = await supabase.from("crm_custom_fields").select("id, entity, key, label, field_type, options, is_required, is_active").order("sort_order").order("created_at");
  return (
    <>
      <PageHeader title="Custom fields" description="Extra fields on lead, customer and application forms." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav active="custom-fields" />
        <CustomFieldsManager fields={data ?? []} editable={can(viewer, "settings.edit")} />
      </div>
    </>
  );
}
