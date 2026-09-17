import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MarkupRule } from "./markup";

/** Used when the database is not configured (local development). */
const DEFAULT_RULES: MarkupRule[] = [
  { id: "default-flight", name: "Default flight markup", product: "flight", markupType: "fixed", value: 1000, isPromotional: false, priority: 0, isActive: true },
  { id: "default-hotel", name: "Default hotel markup", product: "hotel", markupType: "percentage", value: 8, isPromotional: false, priority: 0, isActive: true },
];

export async function loadMarkupRules(): Promise<MarkupRule[]> {
  if (!isSupabaseAdminConfigured()) return DEFAULT_RULES;
  const { data, error } = await createAdminClient()
    .from("markup_rules")
    .select("*")
    .eq("is_active", true);
  if (error || !data) {
    console.error("Failed to load markup rules, using defaults", error);
    return DEFAULT_RULES;
  }
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    product: r.product,
    markupType: r.markup_type,
    value: Number(r.value),
    destinationCountry: r.destination_country,
    airlineCode: r.airline_code,
    hotelStarRating: r.hotel_star_rating,
    supplier: r.supplier,
    isPromotional: r.is_promotional,
    priority: r.priority,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    isActive: r.is_active,
  }));
}
