import { z } from "zod";

/** Shared validation for CRM forms. */

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Include at least one letter")
  .regex(/[0-9]/, "Include at least one number");

export const optText = (max = 200) => z.string().trim().max(max).optional();
export const reqText = (label: string, max = 200) => z.string({ error: `${label} is required` }).trim().min(1, `${label} is required`).max(max);
export const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date").optional();
export const optTime = z.string().regex(/^\d{2}:\d{2}$/, "Use a valid time").optional();
export const optUuid = z.uuid().optional();
export const phone = z.string().trim().regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number");
export const optPhone = phone.optional();
export const optEmail = z.email("Enter a valid email").max(254).optional();
export const money = z.coerce.number({ error: "Enter an amount" }).finite().min(0, "Amount can't be negative").max(1_000_000_000);
export const positiveMoney = z.coerce.number({ error: "Enter an amount" }).finite().gt(0, "Amount must be more than zero").max(1_000_000_000);
export const optionKey = z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/, "Invalid option");
export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour");

/** FormData → plain object, with empty strings treated as missing. */
export function formValues(formData: FormData, keys: string[]) {
  const out: Record<string, string | undefined> = {};
  for (const k of keys) {
    const v = formData.get(k);
    out[k] = v === null || (typeof v === "string" && v.trim() === "") ? undefined : typeof v === "string" ? v : undefined;
  }
  return out;
}

export const nullify = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v])) as { [K in keyof T]: Exclude<T[K], undefined> | null };

/** Escapes user input for PostgREST `or=(…ilike…)` filters. */
export function searchTerm(q: string | undefined) {
  return (q ?? "").replace(/[%,()*\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export type CustomFieldSpec = { key: string; label: string; field_type: string; options: string[]; is_required: boolean };

/** Reads and validates cf_<key> inputs against the configured custom fields. */
export function parseCustomFields(formData: FormData, fields: CustomFieldSpec[]): { ok: true; values: Record<string, unknown> } | { ok: false; errors: Record<string, string> } {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const name = `cf_${f.key}`;
    const raw = formData.get(name);
    const s = typeof raw === "string" ? raw.trim() : "";
    if (f.field_type === "checkbox") { values[f.key] = raw === "on"; continue; }
    if (!s) { if (f.is_required) errors[name] = `${f.label} is required`; continue; }
    if (s.length > 2000) { errors[name] = "Too long"; continue; }
    if (f.field_type === "number") {
      const n = Number(s);
      if (!Number.isFinite(n)) errors[name] = "Enter a number"; else values[f.key] = n;
    } else if (f.field_type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) errors[name] = "Enter a valid date"; else values[f.key] = s;
    } else if (f.field_type === "select") {
      if (!f.options.includes(s)) errors[name] = "Choose one of the options"; else values[f.key] = s;
    } else values[f.key] = s;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}
