import "server-only";
import { getViewer, type Viewer } from "@/lib/auth";
import type { FormState } from "@/lib/forms";
import { canAccess, type AdminSection } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";

/** Shared by the Admin Panel server actions. Not a "use server" module, so none of this is callable from the client. */

export const DENIED: FormState = { status: "error", message: "You don't have permission to do that." };
export const FAILED: FormState = { status: "error", message: "Could not save changes. Please try again." };

export async function authorize(section: AdminSection): Promise<Viewer | null> {
  const viewer = await getViewer();
  return viewer && canAccess(viewer.role, section) ? viewer : null;
}

export async function audit(actor: Viewer, action: string, entity: string, entityId: string, changes?: unknown) {
  const { error } = await createAdminClient().from("audit_logs").insert({ actor_id: actor.id, action, entity, entity_id: entityId, changes });
  if (error) console.error("Audit log failed", error);
}

export const blank = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : String(v));
