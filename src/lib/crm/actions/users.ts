"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { crmAudit, crmAuthorize, DENIED, diff, FAILED, INVALID } from "../auth";
import { storePublicImage } from "../files";
import { flash } from "../flash";
import { ALL_PERMISSION_KEYS } from "../permissions";
import { formValues, nullify, optDate, optPhone, optText, optUuid, passwordSchema, reqText } from "../schemas";

const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, "3–40 characters: letters, numbers, dot, dash, underscore");
const staffSchema = z.object({
  full_name: reqText("Full name", 120).pipe(z.string().min(2, "Enter the full name")),
  employee_id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,30}$/, "Letters, numbers, dash or underscore").optional(),
  mobile: optPhone,
  designation: optText(80),
  department: optText(80),
  crm_username: username,
  joining_date: optDate,
  crm_role_id: z.uuid({ error: "Choose a role" }),
  crm_manager_id: optUuid,
  crm_active: z.enum(["active", "inactive"]),
});
const KEYS = ["full_name", "employee_id", "mobile", "designation", "department", "crm_username", "joining_date", "crm_role_id", "crm_manager_id", "crm_active"];

type Db = ReturnType<typeof createAdminClient>;

async function roleById(db: Db, id: string) {
  const { data } = await db.from("crm_roles").select("id, key, name, is_super").eq("id", id).maybeSingle();
  return data;
}

async function uniqueErrors(db: Db, d: { crm_username: string; employee_id?: string }, excludeId?: string) {
  const errors: Record<string, string> = {};
  let q = db.from("profiles").select("id").eq("crm_username", d.crm_username);
  if (excludeId) q = q.neq("id", excludeId);
  if ((await q).data?.length) errors.crm_username = "This username is taken";
  if (d.employee_id) {
    let e = db.from("profiles").select("id").ilike("employee_id", d.employee_id);
    if (excludeId) e = e.neq("id", excludeId);
    if ((await e).data?.length) errors.employee_id = "This employee ID is already used";
  }
  return errors;
}

export async function createStaffUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("users.create");
  if (!viewer) return DENIED;
  const parsed = staffSchema
    .extend({ email: z.email("Enter a valid email").max(254), password: passwordSchema, confirm_password: z.string() })
    .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" })
    .safeParse(formValues(formData, [...KEYS, "email", "password", "confirm_password"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const db = createAdminClient();
  const role = await roleById(db, d.crm_role_id);
  if (!role) return { ...INVALID, fieldErrors: { crm_role_id: "Choose a role" } };
  if (role.is_super && !viewer.isSuper) return { status: "error", message: "Only a Super Admin can create another Super Admin." };
  const dupes = await uniqueErrors(db, d);
  if (Object.keys(dupes).length) return { ...INVALID, fieldErrors: dupes };

  const email = d.email.toLowerCase();
  const avatar = await storePublicImage(formData.get("avatar"), "avatars");
  if (!avatar.ok) return { status: "error", fieldErrors: { avatar: avatar.error }, message: avatar.error };

  // Existing website account with this email?
  const { data: existing } = await db.from("profiles").select("id, role, crm_role_id").eq("email", email).maybeSingle();
  let userId: string;
  let attached = false;
  if (existing) {
    if (existing.crm_role_id) return { ...INVALID, fieldErrors: { email: "This person already has CRM access" } };
    if (existing.role === "customer") return { ...INVALID, fieldErrors: { email: "This email belongs to a customer account on the website. Use a work email." } };
    userId = existing.id;
    attached = true; // platform staff account: keep their password and platform role
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email, password: d.password, email_confirm: true, user_metadata: { full_name: d.full_name, mobile: d.mobile ?? null },
    });
    if (error || !created.user) {
      console.error("CRM user create failed", error?.message);
      return { status: "error", message: error?.message?.includes("already") ? "An account with this email already exists." : "Could not create the account. Please try again." };
    }
    userId = created.user.id;
  }

  const { confirm_password: _c, password: _p, email: _e, crm_active, ...fields } = d;
  const { error: updError } = await db
    .from("profiles")
    .update({
      ...nullify(fields),
      ...(attached ? {} : { role: "crm_staff", email, mobile: d.mobile ?? null }),
      employee_id: d.employee_id ?? null,
      crm_active: crm_active === "active",
      avatar_url: avatar.file?.path ?? null,
    })
    .eq("id", userId);
  if (updError) {
    console.error("CRM profile update failed", updError);
    if (!attached) await db.auth.admin.deleteUser(userId);
    return FAILED;
  }
  await crmAudit(viewer, "user.created", "users", userId, { email, role: role.key, username: d.crm_username, attached_existing_account: attached });
  revalidatePath("/crm/users");
  await flash(attached ? `CRM access granted to ${d.full_name} (existing account — their current password still applies).` : `${d.full_name} can now sign in as “${d.crm_username}”.`);
  redirect(`/crm/users/${userId}`);
}

export async function updateStaffUser(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("users.edit");
  if (!viewer) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const parsed = staffSchema.safeParse(formValues(formData, KEYS));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const d = parsed.data;
  const db = createAdminClient();
  const { data: before } = await db.from("profiles").select("id, full_name, employee_id, mobile, designation, department, crm_username, joining_date, crm_role_id, crm_manager_id, crm_active, avatar_url").eq("id", id.data).maybeSingle();
  if (!before || !before.crm_role_id) return DENIED;
  const [oldRole, newRole] = await Promise.all([roleById(db, before.crm_role_id), roleById(db, d.crm_role_id)]);
  if (!newRole) return { ...INVALID, fieldErrors: { crm_role_id: "Choose a role" } };
  if ((oldRole?.is_super || newRole.is_super) && !viewer.isSuper) return { status: "error", message: "Only a Super Admin can change a Super Admin account or grant that role." };
  if (id.data === viewer.id && (d.crm_role_id !== before.crm_role_id || d.crm_active !== "active")) return { status: "error", message: "You can't change your own role or deactivate yourself." };
  if (d.crm_manager_id === id.data) return { ...INVALID, fieldErrors: { crm_manager_id: "Someone can't report to themselves" } };
  if (oldRole?.is_super && (!newRole.is_super || d.crm_active !== "active")) {
    const { data: supers } = await db.from("profiles").select("id").eq("crm_role_id", oldRole.id).eq("crm_active", true).eq("is_active", true);
    if ((supers ?? []).filter((s) => s.id !== id.data).length === 0) return { status: "error", message: "This is the last active Super Admin. Create another one first." };
  }
  const dupes = await uniqueErrors(db, d, id.data);
  if (Object.keys(dupes).length) return { ...INVALID, fieldErrors: dupes };

  const avatar = await storePublicImage(formData.get("avatar"), "avatars");
  if (!avatar.ok) return { status: "error", fieldErrors: { avatar: avatar.error }, message: avatar.error };
  const { crm_active, ...fields } = d;
  const row: Record<string, unknown> = { ...nullify(fields), crm_active: crm_active === "active" };
  if (avatar.file) row.avatar_url = avatar.file.path;
  if (formData.get("remove_avatar") === "on") row.avatar_url = null;
  const changes = diff(before, row);
  const { error } = await db.from("profiles").update(row).eq("id", id.data);
  if (error) return FAILED;
  if (changes.crm_role_id) await crmAudit(viewer, "permission.role_assigned", "users", id.data, { from: oldRole?.key, to: newRole.key });
  await crmAudit(viewer, changes.crm_active ? (crm_active === "active" ? "user.activated" : "user.deactivated") : "user.updated", "users", id.data, changes);
  revalidatePath("/crm/users");
  return { status: "success", message: "User updated." };
}

export async function setStaffPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize("users.edit");
  if (!viewer) return DENIED;
  const parsed = z
    .object({ id: z.uuid(), password: passwordSchema, confirm_password: z.string() })
    .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" })
    .safeParse(formValues(formData, ["id", "password", "confirm_password"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const db = createAdminClient();
  const { data: target } = await db.from("profiles").select("id, crm_role_id, role:crm_roles!profiles_crm_role_id_fkey(is_super)").eq("id", parsed.data.id).maybeSingle();
  if (!target?.crm_role_id) return DENIED;
  if ((target.role as unknown as { is_super: boolean } | null)?.is_super && !viewer.isSuper) return DENIED;
  const { error } = await db.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.password });
  if (error) return { status: "error", message: "Could not set the password." };
  await crmAudit(viewer, "user.password_set", "users", parsed.data.id);
  return { status: "success", message: "Password updated. Share it with the employee securely." };
}

// ---------------------------------------------------------------------------
// Roles & permissions (Super Admin only)
// ---------------------------------------------------------------------------
const roleSchema = z.object({
  name: reqText("Role name", 60).pipe(z.string().min(2, "Enter a role name")),
  description: optText(300),
  data_scope: z.enum(["all", "team", "own"]),
});

export async function createRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer?.isSuper) return DENIED;
  const parsed = roleSchema.extend({ copy_from: optUuid }).safeParse(formValues(formData, ["name", "description", "data_scope", "copy_from"]));
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const db = createAdminClient();
  const key = `custom_${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "role"}_${Math.random().toString(36).slice(2, 6)}`;
  const { data: role, error } = await db.from("crm_roles").insert({ key, name: parsed.data.name, description: parsed.data.description ?? null, data_scope: parsed.data.data_scope }).select("id").single();
  if (error || !role) return FAILED;
  if (parsed.data.copy_from) {
    const { data: perms } = await db.from("crm_role_permissions").select("permission").eq("role_id", parsed.data.copy_from);
    if (perms?.length) await db.from("crm_role_permissions").insert(perms.map((p) => ({ role_id: role.id, permission: p.permission, granted_by: viewer.id })));
  }
  await crmAudit(viewer, "role.created", "settings", role.id, parsed.data);
  await flash(`Role “${parsed.data.name}” created. Choose its permissions below.`);
  redirect(`/crm/roles/${role.id}`);
}

export async function saveRolePermissions(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer?.isSuper) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  const parsed = roleSchema.safeParse(formValues(formData, ["name", "description", "data_scope"]));
  if (!id.success) return FAILED;
  if (!parsed.success) return { ...INVALID, fieldErrors: fieldErrorsFrom(parsed.error) };
  const db = createAdminClient();
  const { data: role } = await db.from("crm_roles").select("id, is_super, name, data_scope, description").eq("id", id.data).maybeSingle();
  if (!role) return FAILED;
  if (role.is_super) return { status: "error", message: "Super Admin always has every permission." };

  const wanted = new Set(formData.getAll("perm").map(String).filter((p) => ALL_PERMISSION_KEYS.includes(p)));
  const { data: current } = await db.from("crm_role_permissions").select("permission").eq("role_id", id.data);
  const have = new Set((current ?? []).map((p) => p.permission as string));
  const added = [...wanted].filter((p) => !have.has(p));
  const removed = [...have].filter((p) => !wanted.has(p));

  const { error } = await db.from("crm_roles").update(nullify(parsed.data)).eq("id", id.data);
  if (error) return FAILED;
  if (removed.length) await db.from("crm_role_permissions").delete().eq("role_id", id.data).in("permission", removed);
  if (added.length) await db.from("crm_role_permissions").insert(added.map((p) => ({ role_id: id.data, permission: p, granted_by: viewer.id })));
  if (added.length || removed.length || role.data_scope !== parsed.data.data_scope) {
    await crmAudit(viewer, "permission.changed", "settings", id.data, { role: role.name, added, removed, data_scope: { from: role.data_scope, to: parsed.data.data_scope } });
  }
  revalidatePath("/crm/roles");
  return { status: "success", message: `Saved — ${added.length} granted, ${removed.length} revoked.` };
}

export async function deleteRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await crmAuthorize();
  if (!viewer?.isSuper) return DENIED;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return FAILED;
  const db = createAdminClient();
  const { data: role } = await db.from("crm_roles").select("id, name, is_system").eq("id", id.data).maybeSingle();
  if (!role) return FAILED;
  if (role.is_system) return { status: "error", message: "Built-in roles can't be deleted (you can change their permissions)." };
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("crm_role_id", id.data);
  if (count) return { status: "error", message: `${count} user${count > 1 ? "s have" : " has"} this role. Move them to another role first.` };
  const { error } = await db.from("crm_roles").delete().eq("id", id.data);
  if (error) return FAILED;
  await crmAudit(viewer, "role.deleted", "settings", id.data, { name: role.name });
  await flash(`Role “${role.name}” deleted.`);
  redirect("/crm/roles");
}
