import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type Stage = {
  id: string; key: string; name: string; color: string; sort_order: number;
  is_default: boolean; is_won: boolean; is_lost: boolean; is_active: boolean; legacy_status: string | null;
};
export type OptionKind = "lead_source" | "visa_category" | "destination_country" | "application_status" | "expense_category" | "payment_mode" | "document_type";
export type Option = { id: string; kind: OptionKind; key: string; label: string; color: string | null; sort_order: number; is_active: boolean };
export type CustomField = {
  id: string; entity: "lead" | "customer" | "application"; key: string; label: string;
  field_type: "text" | "textarea" | "number" | "date" | "select" | "checkbox"; options: string[]; is_required: boolean; sort_order: number; is_active: boolean;
};
export type Staff = { id: string; full_name: string | null; email: string | null; crm_active: boolean; is_active: boolean; crm_manager_id: string | null; role_name: string | null };
export type Company = { name: string; email?: string; phone?: string; address?: string; gstin?: string; website?: string; logo_url?: string | null };
export type NotificationPrefs = Record<string, boolean>;

export type CrmConfig = {
  stages: Stage[];
  activeStages: Stage[];
  stageById: Map<string, Stage>;
  options: Record<OptionKind, Option[]>;
  label: (kind: OptionKind, key: string | null | undefined) => string;
  color: (kind: OptionKind, key: string | null | undefined) => string | null;
  customFields: CustomField[];
  staff: Staff[];
  staffName: (id: string | null | undefined) => string;
  company: Company;
  currency: string;
  notifications: NotificationPrefs;
};

const KINDS: OptionKind[] = ["lead_source", "visa_category", "destination_country", "application_status", "expense_category", "payment_mode", "document_type"];

const titleCase = (v: string) => v.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Stages, option lists, settings and the staff list are identical for every
 * CRM user and change rarely, so they're kept in memory for a short time
 * instead of costing ~5 database requests on every page. Only call this after
 * requireCrm()/crmAuthorize(). Mutations call invalidateCrmConfig(); other
 * server instances pick up changes within CONFIG_TTL_MS.
 */
const CONFIG_TTL_MS = 30_000;
// Holds resolved data only (Workers can't share in-flight I/O between requests).
let configCache: { at: number; value: CrmConfig } | null = null;

export function invalidateCrmConfig() {
  configCache = null;
}

/** CRM configuration, cached per request and briefly per server instance. */
export const getCrmConfig = cache(async (): Promise<CrmConfig> => {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) return configCache.value;
  const value = await loadCrmConfig();
  configCache = { at: Date.now(), value };
  return value;
});

async function loadCrmConfig(): Promise<CrmConfig> {
  const supabase = createAdminClient();
  const [stages, options, fields, settings, staff] = await Promise.all([
    supabase.from("crm_lead_stages").select("id, key, name, color, sort_order, is_default, is_won, is_lost, is_active, legacy_status").order("sort_order"),
    supabase.from("crm_options").select("id, kind, key, label, color, sort_order, is_active").order("sort_order"),
    supabase.from("crm_custom_fields").select("id, entity, key, label, field_type, options, is_required, sort_order, is_active").order("sort_order"),
    supabase.from("crm_settings").select("key, value"),
    supabase.from("profiles").select("id, full_name, email, crm_active, is_active, crm_manager_id, role:crm_roles!profiles_crm_role_id_fkey(name)").not("crm_role_id", "is", null).order("full_name"),
  ]);

  const stageList = (stages.data ?? []) as Stage[];
  const grouped = Object.fromEntries(KINDS.map((k) => [k, [] as Option[]])) as Record<OptionKind, Option[]>;
  for (const o of (options.data ?? []) as Option[]) grouped[o.kind]?.push(o);
  const optionMap = new Map((options.data ?? []).map((o) => [`${o.kind}:${o.key}`, o as Option]));
  const settingMap = new Map((settings.data ?? []).map((s) => [s.key as string, s.value as unknown]));
  const staffList = (staff.data ?? []).map((s) => ({
    id: s.id, full_name: s.full_name, email: s.email, crm_active: s.crm_active, is_active: s.is_active, crm_manager_id: s.crm_manager_id,
    role_name: (s.role as unknown as { name: string } | null)?.name ?? null,
  })) as Staff[];
  const staffById = new Map(staffList.map((s) => [s.id, s]));

  return {
    stages: stageList,
    activeStages: stageList.filter((s) => s.is_active),
    stageById: new Map(stageList.map((s) => [s.id, s])),
    options: grouped,
    label: (kind, key) => (key ? optionMap.get(`${kind}:${key}`)?.label ?? titleCase(key) : "—"),
    color: (kind, key) => (key ? optionMap.get(`${kind}:${key}`)?.color ?? null : null),
    customFields: ((fields.data ?? []) as CustomField[]).filter((f) => f.is_active),
    staff: staffList,
    staffName: (id) => (id ? staffById.get(id)?.full_name || staffById.get(id)?.email || "Former user" : "Unassigned"),
    company: (settingMap.get("company") as Company) ?? { name: "New Visa" },
    currency: (settingMap.get("currency") as string) || "INR",
    notifications: (settingMap.get("notifications") as NotificationPrefs) ?? {},
  };
}

/** Active staff for assignment pickers. */
export function assignableStaff(config: CrmConfig) {
  return config.staff.filter((s) => s.crm_active && s.is_active);
}
