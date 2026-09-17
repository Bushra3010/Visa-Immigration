import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { canAccess, type AdminSection, type AppRole } from "@/lib/roles";

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
};

/** Current signed-in user with profile, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Always request-time: auth-dependent pages must never be prerendered,
  // even when env vars are absent at build time.
  await connection();
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, is_active")
    .eq("id", auth.user.id)
    .single();
  if (!profile || !profile.is_active) return null;

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    fullName: profile.full_name,
    role: profile.role as AppRole,
  };
});

export async function requireViewer(next = "/dashboard") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireSection(section: AdminSection) {
  const viewer = await requireViewer(`/admin`);
  if (!canAccess(viewer.role, section)) redirect(viewer.role === "customer" ? "/dashboard" : "/admin");
  return viewer;
}
