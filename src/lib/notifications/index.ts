import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notification dispatch (PRD §8.9). Email/WhatsApp providers are open
 * decisions (PRD §17), so delivery is abstracted behind `Channel` adapters.
 * Until a provider is configured, messages are logged and recorded as
 * `skipped` so nothing is silently lost.
 */

export type Template =
  | "eligibility_submitted"
  | "lead_assigned"
  | "consultation_requested"
  | "consultation_counsellor_alert"
  | "enquiry_received"
  | "document_requested"
  | "application_updated"
  | "payment_confirmed"
  | "booking_confirmed"
  | "booking_cancelled";

type Message = { template: Template; to: string; userId?: string | null; payload: Record<string, unknown> };

interface Channel {
  readonly name: "email" | "whatsapp";
  isConfigured(): boolean;
  send(message: Message): Promise<void>;
}

const emailChannel: Channel = {
  name: "email",
  isConfigured: () => Boolean(process.env.EMAIL_PROVIDER && process.env.EMAIL_PROVIDER !== "console"),
  async send() {
    // Implement once the email provider is selected (e.g. Resend, SES, SendGrid).
    throw new Error(`Email provider "${process.env.EMAIL_PROVIDER}" is not implemented`);
  },
};

const whatsappChannel: Channel = {
  name: "whatsapp",
  isConfigured: () => process.env.WHATSAPP_ENABLED === "true",
  async send() {
    throw new Error("WhatsApp Business API integration is not implemented yet");
  },
};

async function record(channel: string, message: Message, status: "sent" | "failed" | "skipped", error?: string) {
  if (!isSupabaseAdminConfigured()) return;
  const { error: dbError } = await createAdminClient().from("notifications").insert({
    user_id: message.userId ?? null,
    channel,
    template: message.template,
    recipient: message.to,
    payload: message.payload,
    status,
    error,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
  if (dbError) console.error("Failed to record notification", dbError);
}

async function dispatch(channel: Channel, message: Message) {
  if (!channel.isConfigured()) {
    console.info(`[notify:${channel.name}] (not configured) ${message.template} → ${message.to}`);
    return record(channel.name, message, "skipped", "channel not configured");
  }
  try {
    await channel.send(message);
    await record(channel.name, message, "sent");
  } catch (err) {
    console.error(`[notify:${channel.name}] failed`, err);
    await record(channel.name, message, "failed", err instanceof Error ? err.message : String(err));
  }
}

export async function notify(opts: { template: Template; email?: string; mobile?: string; userId?: string | null; payload: Record<string, unknown> }) {
  const jobs: Promise<unknown>[] = [];
  if (opts.email) jobs.push(dispatch(emailChannel, { template: opts.template, to: opts.email, userId: opts.userId, payload: opts.payload }));
  if (opts.mobile) jobs.push(dispatch(whatsappChannel, { template: opts.template, to: opts.mobile, userId: opts.userId, payload: opts.payload }));
  await Promise.allSettled(jobs);
}

/** In-app notification for staff/customers. */
export async function notifyInApp(userId: string, template: Template, payload: Record<string, unknown>) {
  if (!isSupabaseAdminConfigured()) return;
  const { error } = await createAdminClient()
    .from("notifications")
    .insert({ user_id: userId, channel: "in_app", template, payload, status: "sent", sent_at: new Date().toISOString() });
  if (error) console.error("Failed to create in-app notification", error);
}
