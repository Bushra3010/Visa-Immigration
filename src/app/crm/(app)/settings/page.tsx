import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/crm/blocks";
import { CompanyForm, PreferencesForm } from "@/components/crm/settings-forms";
import { can, requireCrm } from "@/lib/crm/auth";
import { getCrmConfig } from "@/lib/crm/config";
import { SettingsNav } from "./nav";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireCrm("settings.view");
  const config = await getCrmConfig();
  const editable = can(viewer, "settings.edit");
  return (
    <>
      <PageHeader title="CRM settings" description="Customise the CRM without code changes." />
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <SettingsNav active="general" />
        <div className="space-y-4">
          <Panel title="Company information" description="Used on payment receipts and exported reports."><CompanyForm company={config.company} editable={editable} /></Panel>
          <Panel title="Currency & notifications"><PreferencesForm currency={config.currency} notifications={config.notifications} editable={editable} /></Panel>
        </div>
      </div>
    </>
  );
}
