import "server-only";

/**
 * Server-side environment access. Secrets (service role key, supplier and
 * payment credentials) are read here only — never from client components.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  flightProvider: process.env.FLIGHT_PROVIDER ?? "mock",
  hotelProvider: process.env.HOTEL_PROVIDER ?? "mock",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isSupabaseAdminConfigured() {
  return isSupabaseConfigured() && Boolean(env.supabaseServiceRoleKey);
}
