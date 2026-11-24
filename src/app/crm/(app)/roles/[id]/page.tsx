import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/blocks";
import { DeleteRole, PermissionMatrix } from "@/components/crm/user-forms";
import { requireCrm } from "@/lib/crm/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Role permissions" };

export default async function RolePage({ params }: PageProps<"/crm/roles/[id]">) {
  const viewer = await requireCrm("users.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: role }, { data: perms }] = await Promise.all([
    supabase.from("crm_roles").select("id, name, description, data_scope, is_system, is_super").eq("id", id).maybeSingle(),
    supabase.from("crm_role_permissions").select("permission").eq("role_id", id),
  ]);
  if (!role) notFound();
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader back={{ href: "/crm/roles", label: "Roles" }} title={role.name} description={role.is_system ? "Built-in role — permissions can be adjusted." : "Custom role"}
        actions={viewer.isSuper && !role.is_system && <DeleteRole id={role.id} name={role.name} />} />
      <PermissionMatrix role={role} granted={(perms ?? []).map((p) => p.permission)} locked={!viewer.isSuper} />
    </div>
  );
}
