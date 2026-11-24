import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeader, Pill } from "@/components/crm/blocks";
import { NewRole } from "@/components/crm/user-forms";
import { requireCrm } from "@/lib/crm/auth";
import { DATA_SCOPES } from "@/lib/crm/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const viewer = await requireCrm("users.view");
  const supabase = await createClient();
  const [{ data: roles }, { data: grants }, { data: users }] = await Promise.all([
    supabase.from("crm_roles").select("id, key, name, description, data_scope, is_system, is_super").order("is_super", { ascending: false }).order("is_system", { ascending: false }).order("name"),
    supabase.from("crm_role_permissions").select("role_id"),
    supabase.from("profiles").select("crm_role_id").not("crm_role_id", "is", null),
  ]);
  const permCount = new Map<string, number>();
  for (const g of grants ?? []) permCount.set(g.role_id, (permCount.get(g.role_id) ?? 0) + 1);
  const userCount = new Map<string, number>();
  for (const u of users ?? []) userCount.set(u.crm_role_id, (userCount.get(u.crm_role_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Roles & permissions" description="Module-wise permissions enforced in the interface, the server and the database (row-level security)."
        actions={viewer.isSuper && <NewRole roles={(roles ?? []).filter((r) => !r.is_super).map((r) => ({ value: r.id, label: r.name }))} />} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(roles ?? []).map((r) => (
          <Link key={r.id} href={`/crm/roles/${r.id}`} className="group rounded-2xl border border-line bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><ShieldCheck className="size-5" /></span>
              <div className="flex gap-1">{r.is_super && <Pill tone="brand">Full access</Pill>}{r.is_system ? <Pill>Built-in</Pill> : <Pill tone="info">Custom</Pill>}</div>
            </div>
            <h2 className="mt-3 font-semibold group-hover:text-brand-700">{r.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description ?? "—"}</p>
            <p className="mt-3 text-xs text-ink-soft">{r.is_super ? "All permissions" : `${permCount.get(r.id) ?? 0} permissions`} · {userCount.get(r.id) ?? 0} users · {DATA_SCOPES.find((d) => d.value === (r.is_super ? "all" : r.data_scope))?.label}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
