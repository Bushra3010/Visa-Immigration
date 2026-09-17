import type { Metadata } from "next";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/fields";
import { Badge } from "@/components/ui/primitives";
import { updateUserAccess } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { ROLE_LABELS, ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireSection("users");
  const { q, role } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, mobile, role, is_active, created_at, applications!applications_user_id_fkey(count), travel_bookings(count), payments(count), documents!documents_user_id_fkey(count)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (typeof role === "string" && role) query = query.eq("role", role);
  if (typeof q === "string" && q) {
    const s = q.replace(/[%,()]/g, "");
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
  }
  const { data } = await query;
  const n = (v: unknown) => (v as { count: number }[] | null)?.[0]?.count ?? 0;

  return (
    <>
      <PageHeader title="Users" description="Customers register themselves. To create staff, have them register, then assign a role here." />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" placeholder="Search name or email" defaultValue={typeof q === "string" ? q : ""} className="max-w-xs" />
        <Select name="role" defaultValue={typeof role === "string" ? role : ""} className="max-w-xs"><option value="">All roles</option>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select>
        <button className={buttonClass("primary")}>Filter</button>
      </form>
      <DataTable head={["User", "Applications", "Documents", "Bookings", "Payments", "Joined", "Role & access"]}>
        {(data ?? []).map((u) => (
          <tr key={u.id}>
            <Td><p className="font-medium">{u.full_name ?? "—"} {!u.is_active && <Badge tone="danger">Disabled</Badge>}</p><p className="text-xs text-muted">{u.email}<br />{u.mobile}</p></Td>
            <Td>{n(u.applications)}</Td>
            <Td>{n(u.documents)}</Td>
            <Td>{n(u.travel_bookings)}</Td>
            <Td>{n(u.payments)}</Td>
            <Td className="text-xs text-muted">{formatDate(u.created_at)}</Td>
            <Td>
              <ActionForm action={updateUserAccess} submitLabel="Update" className="min-w-48">
                <input type="hidden" name="userId" value={u.id} />
                <Select name="role" defaultValue={u.role} aria-label="Role">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</Select>
                <Select name="isActive" defaultValue={String(u.is_active)} aria-label="Account status"><option value="true">Active</option><option value="false">Disabled</option></Select>
              </ActionForm>
            </Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
