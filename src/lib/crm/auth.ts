import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { DataScope } from "./permissions";

export type CrmViewer = {
  id: string;
  email: string | null;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  designation: string | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  isSuper: boolean;
  scope: DataScope;
  permissions: string[];
};

type RoleRow = { id: string; key: string; name: string; is_super: boolean; data_scope: DataScope };

/**
 * The signed-in CRM user, or null when there's no session, the account is
 * disabled, or it has no CRM role. Resolved once per request.
 */
export const getCrmViewer = cache(async (): Promise<CrmViewer | null> => {
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, crm_username, avatar_url, designation, is_active, crm_active, crm_role_id, role:crm_roles!profiles_crm_role_id_fkey(id, key, name, is_super, data_scope)")
    .eq("id", auth.user.id)
    .maybeSingle();
  const role = profile?.role as unknown as RoleRow | null;
  if (!profile || !profile.is_active || !profile.crm_active || !role) return null;

  const { data: perms } = await supabase.from("crm_role_permissions").select("permission").eq("role_id", role.id);
  return {
    id: profile.id,
    email: profile.email ?? auth.user.email ?? null,
    fullName: profile.full_name || profile.email || "CRM user",
    username: profile.crm_username,
    avatarUrl: profile.avatar_url,
    designation: profile.designation,
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    isSuper: role.is_super,
    scope: role.is_super ? "all" : role.data_scope,
    permissions: (perms ?? []).map((p) => p.permission as string),
  };
});

export function can(viewer: Pick<CrmViewer, "isSuper" | "permissions"> | null | undefined, permission: string) {
  return !!viewer && (viewer.isSuper || viewer.permissions.includes(permission));
}

export function canAny(viewer: Pick<CrmViewer, "isSuper" | "permissions"> | null | undefined, permissions: string[]) {
  return permissions.some((p) => can(viewer, p));
}

/** For pages: sends anonymous users to the login screen and users without the permission to the no-access page. */
export async function requireCrm(permission?: string | string[]) {
  const viewer = await getCrmViewer();
  if (!viewer) redirect("/crm/login");
  if (permission) {
    const list = Array.isArray(permission) ? permission : [permission];
    if (!canAny(viewer, list)) redirect("/crm/no-access");
  }
  return viewer;
}

export const DENIED: FormState = { status: "error", message: "You don't have permission to do that." };
export const FAILED: FormState = { status: "error", message: "Something went wrong saving your changes. Please try again." };
export const INVALID: FormState = { status: "error", message: "Please check the highlighted fields." };

/** For server actions: returns the viewer only if they hold every listed permission. */
export async function crmAuthorize(...permissions: string[]): Promise<CrmViewer | null> {
  const viewer = await getCrmViewer();
  if (!viewer) return null;
  return permissions.every((p) => can(viewer, p)) ? viewer : null;
}

/** Maps Postgres / PostgREST errors to a message safe to show staff. */
export function dbErrorMessage(error: { code?: string; message?: string } | null | undefined, fallback = FAILED.message!) {
  if (!error) return fallback;
  if (error.code === "42501") return error.message?.startsWith("new row violates") ? DENIED.message! : (error.message ?? DENIED.message!);
  if (error.code === "23505") return error.message?.includes("already") ? error.message : "A record with these details already exists.";
  if (error.code === "23503") return "This record is linked to other records and can't be removed. Remove or reassign those first.";
  if (error.code === "23514" || error.code === "22P02" || error.code === "22023") return "Some values aren't valid. Please check the form.";
  if (error.code === "P0002") return error.message ?? "Record not found.";
  return fallback;
}

/** Audit trail (written with the service role; staff can't edit or delete entries). */
export async function crmAudit(viewer: Pick<CrmViewer, "id"> | null, action: string, module: string, recordId: string | null, changes?: unknown) {
  if (!isSupabaseAdminConfigured()) return;
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get("cf-connecting-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    // outside a request scope
  }
  const { error } = await createAdminClient().from("audit_logs").insert({
    actor_id: viewer?.id ?? null,
    action,
    module,
    entity: module,
    entity_id: recordId,
    changes: changes ?? null,
    ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
    user_agent: userAgent,
  });
  if (error) console.error("CRM audit log failed", error);
}

/** Field-level diff for audit entries and lead history. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [k, v] of Object.entries(after)) {
    const prev = before[k] ?? null;
    const next = v ?? null;
    if (JSON.stringify(prev) !== JSON.stringify(next)) changes[k] = { from: prev, to: next };
  }
  return changes;
}
