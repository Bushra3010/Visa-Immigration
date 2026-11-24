import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Avatar, Empty, filterControl, FilterBar, PageHeader, Pill, Table, TBody, Td, THead, Th, Tr } from "@/components/crm/blocks";
import { AutoSubmit } from "@/components/crm/interactive";
import { buttonClass } from "@/components/ui/button";
import { can, requireCrm } from "@/lib/crm/auth";
import { fmtDate, relativeTime } from "@/lib/crm/format";
import { searchTerm } from "@/lib/crm/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/crm/users">) {
  const viewer = await requireCrm("users.view");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const supabase = await createClient();
  const { data: roles } = await supabase.from("crm_roles").select("id, name").order("name");
  let q = supabase.from("profiles")
    .select("id, full_name, email, mobile, employee_id, crm_username, designation, department, joining_date, avatar_url, crm_active, is_active, crm_last_login_at, crm_manager_id, crm_role_id, role:crm_roles!profiles_crm_role_id_fkey(name, is_super)")
    .not("crm_role_id", "is", null).order("full_name");
  const term = searchTerm(str("q"));
  if (term) q = q.or(`full_name.ilike.*${term}*,email.ilike.*${term}*,crm_username.ilike.*${term}*,employee_id.ilike.*${term}*,mobile.ilike.*${term}*`);
  if (str("role")) q = q.eq("crm_role_id", str("role"));
  if (str("status") === "active") q = q.eq("crm_active", true);
  if (str("status") === "inactive") q = q.eq("crm_active", false);
  const { data } = await q;
  const names = new Map((data ?? []).map((u) => [u.id, u.full_name]));

  return (
    <>
      <PageHeader title="Users & employees" description={`${data?.length ?? 0} CRM users. Only administrators can create accounts — there is no public sign-up.`}
        actions={<>
          <Link href="/crm/roles" className={buttonClass("secondary", "sm")}>Roles & permissions</Link>
          {can(viewer, "users.create") && <Link href="/crm/users/new" className={buttonClass("primary", "sm")}><Plus className="size-4" />New user</Link>}
        </>} />
      <FilterBar action="/crm/users">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={str("q")} placeholder="Name, email, username, employee ID" className={`${filterControl} w-full pl-9`} aria-label="Search" />
        </div>
        <AutoSubmit>
          <select name="role" defaultValue={str("role")} className={filterControl} aria-label="Role"><option value="">All roles</option>{(roles ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <select name="status" defaultValue={str("status")} className={filterControl} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </AutoSubmit>
      </FilterBar>
      <Table minWidth={960}>
        <THead><Th>Employee</Th><Th>Username</Th><Th>Role</Th><Th>Designation / dept.</Th><Th>Reports to</Th><Th>Joined</Th><Th>Last sign-in</Th><Th>Status</Th></THead>
        <TBody>
          {(data ?? []).map((u) => {
            const role = u.role as unknown as { name: string; is_super: boolean } | null;
            return (
              <Tr key={u.id}>
                <Td>
                  <Link href={`/crm/users/${u.id}`} className="flex items-center gap-3">
                    <Avatar name={u.full_name} src={u.avatar_url} />
                    <span className="min-w-0"><span className="block truncate font-semibold hover:text-brand-700">{u.full_name ?? "—"}</span><span className="block truncate text-xs text-muted">{u.email}{u.employee_id ? ` · ${u.employee_id}` : ""}</span></span>
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{u.crm_username ?? "—"}</Td>
                <Td>{role && <Pill tone={role.is_super ? "brand" : "neutral"}>{role.name}</Pill>}</Td>
                <Td className="text-xs">{u.designation ?? "—"}<br /><span className="text-muted">{u.department ?? ""}</span></Td>
                <Td className="text-xs">{u.crm_manager_id ? names.get(u.crm_manager_id) ?? "—" : "—"}</Td>
                <Td className="text-xs">{fmtDate(u.joining_date)}</Td>
                <Td className="text-xs text-muted">{u.crm_last_login_at ? relativeTime(u.crm_last_login_at) : "Never"}</Td>
                <Td>{u.crm_active && u.is_active ? <Pill tone="success">Active</Pill> : <Pill>Inactive</Pill>}</Td>
              </Tr>
            );
          })}
          {!data?.length && <tr><td colSpan={8}><Empty title="No users match" /></td></tr>}
        </TBody>
      </Table>
    </>
  );
}
