import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Country and category pickers for the visa page editor, drafts included. */
export async function serviceOptions() {
  const supabase = await createClient();
  const [{ data: countries }, { data: categories }] = await Promise.all([
    supabase.from("countries").select("slug, name, is_published").order("sort_order").order("name"),
    supabase.from("visa_categories").select("slug, name, is_published").order("sort_order"),
  ]);
  const toOption = (r: { slug: string; name: string; is_published: boolean }) => ({ value: r.slug, label: r.is_published ? r.name : `${r.name} (draft)` });
  return { countries: (countries ?? []).map(toOption), categories: (categories ?? []).map(toOption) };
}
