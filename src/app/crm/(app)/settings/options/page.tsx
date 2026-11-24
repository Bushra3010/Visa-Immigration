import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/blocks";
import { OptionsManager } from "@/components/crm/settings-forms";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { OPTION_KINDS, SettingsNav } from "../nav";

export const metadata: Metadata = { title: "Option lists" };

export default async function OptionsPage({ searchParams }: PageProps<"/crm/settings/options">) {
  const viewer = await requireCrm("settings.view");
  const sp = await searchParams;
  const def = OPTION_KINDS.find((k) => k.kind === sp.kind) ?? OPTION_KINDS[0];
  if (!def) notFound();
  const config = await getCrmConfig();
  return (
    <>
      <PageHeader title={def.label} description="Values offered in CRM forms and filters." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav active={def.kind} />
        <OptionsManager kind={def.kind} label={def.single} options={config.options[def.kind]} editable={can(viewer, "settings.edit")} withColor={def.color} />
      </div>
    </>
  );
}
