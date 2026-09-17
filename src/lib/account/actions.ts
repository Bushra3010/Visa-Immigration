"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/forms";
import { notifyInApp } from "@/lib/notifications";
import { rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please log in again." };
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your full name").max(120),
      mobile: z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid mobile number"),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
      countryOfResidence: z.string().trim().max(80).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  // RLS-bound client: users can only update their own row; role changes are blocked by trigger.
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      mobile: parsed.data.mobile,
      date_of_birth: parsed.data.dateOfBirth || null,
      country_of_residence: parsed.data.countryOfResidence || null,
    })
    .eq("id", viewer.id);
  if (error) return { status: "error", message: "Could not save your profile." };
  revalidatePath("/dashboard/profile");
  return { status: "success", message: "Profile updated." };
}

export async function sendMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please log in again." };
  if (!(await rateLimit("message", 20, 10 * 60_000)).ok) return { status: "error", message: "You're sending messages too quickly." };
  const parsed = z.object({ body: z.string().trim().min(1, "Write a message").max(2000), applicationId: z.uuid().optional().or(z.literal("")) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await createClient();
  let counsellorId: string | null = null;
  if (parsed.data.applicationId) {
    const { data: app } = await supabase.from("applications").select("id, counsellor_id").eq("id", parsed.data.applicationId).eq("user_id", viewer.id).maybeSingle();
    if (!app) return { status: "error", message: "Application not found." };
    counsellorId = app.counsellor_id;
  }
  const { error } = await supabase.from("messages").insert({
    customer_id: viewer.id,
    sender_id: viewer.id,
    application_id: parsed.data.applicationId || null,
    body: parsed.data.body,
  });
  if (error) return { status: "error", message: "Could not send message." };
  if (counsellorId) await notifyInApp(counsellorId, "application_updated", { event: "customer_message", customerId: viewer.id });
  revalidatePath("/dashboard/messages");
  return { status: "success", message: "Message sent." };
}

export async function markNotificationsRead() {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", viewer.id).is("read_at", null);
  revalidatePath("/dashboard/notifications");
}
