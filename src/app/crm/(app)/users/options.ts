import "server-only";
import type { CrmViewer } from "@/lib/crm/auth";
import { createClient } from "@/lib/supabase/server";

export async function staffFormOptions(viewer: CrmViewer) {
  const supabase = await createClient();
  const [{ data: roles }, { data: people }] = await Promise.all([
    supabase.from("crm_roles").select("id, name, is_super").order("is_super", { ascending: false }).order("name"),
    supabase.from("profiles").select("id, full_name, email").not("crm_role_id", "is", null).eq("crm_active", true).order("full_name"),
  ]);
  return {
    roles: (roles ?? []).filter((r) => viewer.isSuper || !r.is_super).map((r) => ({ value: r.id, label: r.name })),
    managers: (people ?? []).map((p) => ({ value: p.id, label: p.full_name ?? p.email ?? "" })),
  };
}
