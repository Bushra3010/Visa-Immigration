"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env, isSupabaseConfigured } from "@/lib/env";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

const NOT_CONFIGURED: FormState = { status: "error", message: "Accounts are coming soon. This is a preview of the site — please contact us or book a consultation in the meantime." };
const password = z.string().min(10, "Use at least 10 characters").max(128);

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await rateLimit("login", 10, 10 * 60_000)).ok) return { status: "error", message: "Too many attempts. Please wait and try again." };

  const parsed = z.object({ email: z.email("Enter a valid email"), password: z.string().min(1, "Enter your password") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { status: "error", message: "Incorrect email or password." };

  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", data.user.id).single();
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { status: "error", message: "This account has been disabled. Please contact support." };
  }
  const fallback = profile && profile.role !== "customer" ? "/admin" : "/dashboard";
  redirect(safeNext(formData.get("next"), fallback));
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await rateLimit("register", 5, 60 * 60_000)).ok) return { status: "error", message: "Too many attempts. Please try again later." };

  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your full name").max(120),
      email: z.email("Enter a valid email"),
      mobile: z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid mobile number"),
      password,
      confirmPassword: z.string(),
      terms: z.literal("on", { message: "Please accept the terms" }),
    })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, mobile: parsed.data.mobile },
      emailRedirectTo: `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    // Avoid confirming whether an email is registered.
    console.error("Sign-up failed", error.message);
    return { status: "error", message: "We couldn't create your account. Please check your details and try again." };
  }
  if (data.session) redirect(next);
  return { status: "success", message: "Check your email to verify your address, then log in." };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  if (!(await rateLimit("reset", 5, 60 * 60_000)).ok) return { status: "error", message: "Too many attempts. Please try again later." };
  const parsed = z.object({ email: z.email("Enter a valid email") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/reset-password`,
  });
  if (error) console.error("Password reset request failed", error.message);
  // Same response either way to prevent account enumeration.
  return { status: "success", message: "If an account exists for that email, we've sent a reset link." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const parsed = z
    .object({ password, confirmPassword: z.string() })
    .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: "Could not update password. Please try again." };
  redirect("/dashboard?passwordUpdated=1");
}

export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
