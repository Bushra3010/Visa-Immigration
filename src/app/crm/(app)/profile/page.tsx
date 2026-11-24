import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Avatar, KV, PageHeader, Panel, Pill } from "@/components/crm/blocks";
import { ChangePasswordForm, ProfileForm, SignOutOthers } from "@/components/crm/settings-forms";
import { buttonClass } from "@/components/ui/button";
import { crmLogout } from "@/lib/crm/actions/auth";
import { requireCrm } from "@/lib/crm/auth";
import { fmtDate } from "@/lib/crm/format";
import { DATA_SCOPES } from "@/lib/crm/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const viewer = await requireCrm();
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("full_name, email, mobile, employee_id, crm_username, designation, department, joining_date").eq("id", viewer.id).single();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="My profile" actions={<form action={crmLogout}><button className={buttonClass("secondary", "sm")}><LogOut className="size-4" />Log out</button></form>} />
      <Panel>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={viewer.fullName} src={viewer.avatarUrl} size="lg" />
          <div className="flex-1">
            <p className="text-lg font-bold">{viewer.fullName}</p>
            <p className="text-sm text-muted">{me?.designation ?? viewer.roleName}{me?.department ? ` · ${me.department}` : ""}</p>
            <div className="mt-1 flex gap-1"><Pill tone="brand">{viewer.roleName}</Pill><Pill>{DATA_SCOPES.find((d) => d.value === viewer.scope)?.label}</Pill></div>
          </div>
        </div>
        <div className="mt-5"><KV cols={4} items={[{ label: "Username", value: me?.crm_username }, { label: "Email", value: me?.email }, { label: "Employee ID", value: me?.employee_id }, { label: "Joined", value: me?.joining_date && fmtDate(me.joining_date) }]} /></div>
      </Panel>
      <Panel title="Edit profile"><ProfileForm name={me?.full_name ?? ""} mobile={me?.mobile ?? null} /></Panel>
      <Panel title="Change password"><ChangePasswordForm /></Panel>
      <Panel title="Sessions" description="Signed in on another computer or phone you no longer use?"><SignOutOthers /></Panel>
    </div>
  );
}
