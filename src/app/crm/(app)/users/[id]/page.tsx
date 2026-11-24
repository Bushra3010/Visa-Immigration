import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, PageHeader, Panel, Pill } from "@/components/crm/blocks";
import { SetPassword, StaffForm } from "@/components/crm/user-forms";
import { can, requireCrm } from "@/lib/crm/auth";
import { fmtDateTime, relativeTime } from "@/lib/crm/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { staffFormOptions } from "../options";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({ params }: PageProps<"/crm/users/[id]">) {
  const viewer = await requireCrm("users.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: u } = await supabase.from("profiles")
    .select("id, full_name, email, mobile, employee_id, crm_username, designation, department, joining_date, avatar_url, crm_active, is_active, crm_role_id, crm_manager_id, crm_last_login_at, created_at, role:crm_roles!profiles_crm_role_id_fkey(id, name, is_super)")
    .eq("id", id).not("crm_role_id", "is", null).maybeSingle();
  if (!u) notFound();
  const role = u.role as unknown as { id: string; name: string; is_super: boolean } | null;
  const editable = can(viewer, "users.edit") && (viewer.isSuper || !role?.is_super);
  const opts = await staffFormOptions(viewer);
  // Recent sign-ins (audit trail; read with the service role only for users with audit or user-edit rights).
  const logins = can(viewer, "audit.view") || can(viewer, "users.edit")
    ? (await createAdminClient().from("audit_logs").select("id, action, created_at, ip").eq("actor_id", id).in("action", ["auth.login", "auth.logout", "auth.login_denied"]).order("created_at", { ascending: false }).limit(8)).data ?? []
    : [];
  const [{ count: leads }, { count: customers }] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("assigned_counsellor_id", id),
    supabase.from("crm_customers").select("id", { count: "exact", head: true }).eq("consultant_id", id),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader back={{ href: "/crm/users", label: "Users" }}
        title={<span className="flex items-center gap-3"><Avatar name={u.full_name} src={u.avatar_url} size="lg" /><span>{u.full_name}<span className="block text-sm font-normal text-muted">{u.designation ?? role?.name}</span></span></span>}
        actions={<>{role && <Pill tone={role.is_super ? "brand" : "neutral"}>{role.name}</Pill>}{u.crm_active ? <Pill tone="success">Active</Pill> : <Pill>Inactive</Pill>}{editable && <SetPassword userId={id} />}</>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div>{editable ? <StaffForm mode="edit" values={u} roles={opts.roles} managers={opts.managers} /> : <Panel><p className="text-sm text-muted">You can view this user but not edit them.</p></Panel>}</div>
        <aside className="space-y-4">
          <Panel title="Workload">
            <p className="text-sm"><Link href={`/crm/leads?assigned=${id}`} className="font-semibold text-brand-700">{leads ?? 0} leads</Link> assigned</p>
            <p className="text-sm"><b>{customers ?? 0}</b> customers as consultant</p>
          </Panel>
          <Panel title="Account">
            <p className="text-sm">Email: {u.email}</p>
            <p className="text-sm">Last sign-in: {u.crm_last_login_at ? relativeTime(u.crm_last_login_at) : "Never"}</p>
            <p className="text-xs text-muted">Account created {fmtDateTime(u.created_at)}</p>
          </Panel>
          {logins.length > 0 && (
            <Panel title="Recent sessions" bodyClassName="p-0">
              <ul className="divide-y divide-line text-xs">{logins.map((l) => (
                <li key={l.id} className="flex justify-between gap-2 px-4 py-2"><span>{l.action === "auth.login" ? "Signed in" : l.action === "auth.logout" ? "Signed out" : "Denied"}{l.ip ? ` · ${l.ip}` : ""}</span><span className="text-muted">{fmtDateTime(l.created_at)}</span></li>
              ))}</ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
