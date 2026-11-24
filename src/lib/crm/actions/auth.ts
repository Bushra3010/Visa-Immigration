"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env, isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { crmAudit, getCrmViewer } from "../auth";
import { flash } from "../flash";
import { passwordSchema } from "../schemas";

const NOT_CONFIGURED: FormState = { status: "error", message: "The CRM database isn't configured on this server." };
const BAD_LOGIN: FormState = { status: "error", message: "Incorrect username/email or password." };
/** Resolves a username to the account email (server-side only; never exposed to the browser). */
async function resolveEmail(identifier: string) {
  const id = identifier.trim().toLowerCase();
  if (id.includes("@")) return id;
  if (!/^[a-z0-9._-]{3,40}$/.test(id)) return null;
  const { data } = await createAdminClient().from("profiles").select("email").eq("crm_username", id).maybeSingle();
  return data?.email ?? null;
}

async function isCrmMember(userId: string) {
  const { data } = await createAdminClient()
    .from("profiles")
    .select("is_active, crm_active, crm_role_id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data && data.is_active && data.crm_active && data.crm_role_id);
}

export async function crmLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseAdminConfigured()) return NOT_CONFIGURED;
  if (!(await rateLimit("crm-login", 8, 10 * 60_000)).ok) return { status: "error", message: "Too many sign-in attempts. Please wait 10 minutes and try again." };

  const parsed = z
    .object({ identifier: z.string().trim().min(3, "Enter your username or email").max(254), password: z.string().min(1, "Enter your password").max(128) })
    .safeParse({ identifier: formData.get("identifier"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const email = await resolveEmail(parsed.data.identifier);
  if (!email) {
    await crmAudit(null, "auth.login_failed", "auth", null, { identifier: parsed.data.identifier.slice(0, 80), reason: "unknown_user" });
    return BAD_LOGIN;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error || !data.user) {
    await crmAudit(null, "auth.login_failed", "auth", null, { identifier: parsed.data.identifier.slice(0, 80), reason: "bad_password" });
    return BAD_LOGIN;
  }

  if (!(await isCrmMember(data.user.id))) {
    await supabase.auth.signOut();
    await crmAudit({ id: data.user.id }, "auth.login_denied", "auth", data.user.id, { reason: "no_crm_access" });
    return { status: "error", message: "This account doesn't have CRM access, or it has been deactivated. Contact your administrator." };
  }

  await createAdminClient().from("profiles").update({ crm_last_login_at: new Date().toISOString() }).eq("id", data.user.id);
  await crmAudit({ id: data.user.id }, "auth.login", "auth", data.user.id);
  redirect("/crm");
}

export async function crmLogout() {
  if (isSupabaseConfigured()) {
    const viewer = await getCrmViewer();
    if (viewer) await crmAudit(viewer, "auth.logout", "auth", viewer.id);
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/crm/login");
}

export async function crmRequestReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseAdminConfigured()) return NOT_CONFIGURED;
  if (!(await rateLimit("crm-reset", 5, 60 * 60_000)).ok) return { status: "error", message: "Too many requests. Please try again later." };
  const parsed = z.object({ identifier: z.string().trim().min(3, "Enter your username or email").max(254) }).safeParse({ identifier: formData.get("identifier") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const email = await resolveEmail(parsed.data.identifier);
  if (email) {
    const { data: profile } = await createAdminClient().from("profiles").select("id, is_active, crm_active, crm_role_id").eq("email", email).maybeSingle();
    // Only active CRM staff can reset through the CRM.
    if (profile && profile.is_active && profile.crm_active && profile.crm_role_id) {
      const supabase = await createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl}/auth/confirm?next=/crm/reset-password` });
      if (error) console.error("CRM password reset request failed", error.message);
      await crmAudit({ id: profile.id }, "auth.reset_requested", "auth", profile.id);
    }
  }
  return { status: "success", message: "If that account has CRM access, a password reset link is on its way to the registered email." };
}

export async function crmResetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseAdminConfigured()) return NOT_CONFIGURED;
  const parsed = z
    .object({ password: passwordSchema, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
    .safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !(await isCrmMember(auth.user.id))) return { status: "error", message: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: error.message.includes("different") ? "Choose a password you haven't used before." : "Could not update the password. Please try again." };
  await crmAudit({ id: auth.user.id }, "auth.password_reset", "auth", auth.user.id);
  await flash("Password updated. Welcome back!");
  redirect("/crm");
}

/** Profile page: change own password (verifies the current one first). */
export async function crmChangePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getCrmViewer();
  if (!viewer || !viewer.email) return { status: "error", message: "Please sign in again." };
  if (!(await rateLimit(`crm-pw:${viewer.id}`, 5, 15 * 60_000)).ok) return { status: "error", message: "Too many attempts. Try again later." };
  const parsed = z
    .object({ currentPassword: z.string().min(1, "Enter your current password"), password: passwordSchema, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
    .refine((v) => v.password !== v.currentPassword, { path: ["password"], message: "Choose a new password" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), message: "Please check the highlighted fields." };

  const supabase = await createClient();
  const check = await supabase.auth.signInWithPassword({ email: viewer.email, password: parsed.data.currentPassword });
  if (check.error) return { status: "error", fieldErrors: { currentPassword: "Current password is incorrect" } };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "Could not update the password. Please try again." };
  await crmAudit(viewer, "auth.password_changed", "auth", viewer.id);
  return { status: "success", message: "Password changed." };
}

/** Ends every other session of the current user (other browsers / devices). */
export async function crmSignOutOthers(): Promise<FormState> {
  const viewer = await getCrmViewer();
  if (!viewer) return { status: "error", message: "Please sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { status: "error", message: "Could not sign out other sessions." };
  await crmAudit(viewer, "auth.signed_out_others", "auth", viewer.id);
  return { status: "success", message: "Signed out of all other devices." };
}
