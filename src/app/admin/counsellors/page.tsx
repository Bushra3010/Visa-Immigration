import type { Metadata } from "next";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { Input } from "@/components/ui/fields";
import { Card, EmptyState } from "@/components/ui/primitives";
import { updateCounsellor } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { VISA_CATEGORIES } from "@/lib/content/categories";
import { COUNTRIES } from "@/lib/content/countries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Counsellors" };

export default async function CounsellorsPage() {
  await requireSection("counsellors");
  const supabase = await createClient();
  const { data: counsellors } = await supabase
    .from("counsellors")
    .select("profile_id, countries, visa_categories, locations, is_available, max_active_leads, profile:profiles!counsellors_profile_id_fkey(full_name, email, is_active)");
  const { data: leadRows } = await supabase.from("leads").select("assigned_counsellor_id, status, next_follow_up_at");
  const { data: appRows } = await supabase.from("applications").select("counsellor_id, status");

  const stats = (id: string) => {
    const leads = (leadRows ?? []).filter((l) => l.assigned_counsellor_id === id);
    const open = leads.filter((l) => !["approved", "rejected", "closed"].includes(l.status)).length;
    const converted = leads.filter((l) => ["application_in_progress", "submitted", "under_review", "approved"].includes(l.status)).length;
    const due = leads.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at) <= new Date()).length;
    const apps = (appRows ?? []).filter((a) => a.counsellor_id === id);
    return { total: leads.length, open, converted, due, apps: apps.length, approved: apps.filter((a) => a.status === "approved").length };
  };

  return (
    <>
      <PageHeader title="Counsellors" description="Specializations drive automatic lead assignment. To add a counsellor, set a user's role to Counsellor in Users." />
      {!counsellors?.length && <EmptyState title="No counsellors yet" />}
      <div className="grid gap-4 xl:grid-cols-2">
        {(counsellors ?? []).map((c) => {
          const p = c.profile as unknown as { full_name: string; email: string; is_active: boolean };
          const s = stats(c.profile_id);
          return (
            <Card key={c.profile_id} className="p-5">
              <div className="flex justify-between gap-2"><div><p className="font-semibold">{p.full_name}</p><p className="text-xs text-muted">{p.email}</p></div></div>
              <dl className="my-4 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
                {[["Leads", s.total], ["Open", s.open], ["Converted", s.converted], ["Follow-ups due", s.due], ["Applications", s.apps], ["Approved", s.approved]].map(([k, v]) => (
                  <div key={k} className="rounded bg-canvas p-2"><dt className="text-muted">{k}</dt><dd className="text-base font-semibold">{v}</dd></div>
                ))}
              </dl>
              <ActionForm action={updateCounsellor} submitLabel="Save">
                <input type="hidden" name="profileId" value={c.profile_id} />
                <fieldset><legend className="text-sm font-medium">Countries</legend>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{COUNTRIES.map((co) => <label key={co.slug} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="countries" value={co.slug} defaultChecked={c.countries.includes(co.slug)} className="accent-brand-600" />{co.name}</label>)}</div>
                </fieldset>
                <fieldset><legend className="text-sm font-medium">Visa categories</legend>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">{VISA_CATEGORIES.map((v) => <label key={v.slug} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="visaCategories" value={v.slug} defaultChecked={c.visa_categories.includes(v.slug)} className="accent-brand-600" />{v.name}</label>)}</div>
                </fieldset>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-sm">Lead locations (comma separated)<Input name="locations" defaultValue={c.locations.join(", ")} /></label>
                  <label className="text-sm">Max open leads<Input name="maxActiveLeads" type="number" min={1} defaultValue={c.max_active_leads} /></label>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAvailable" defaultChecked={c.is_available} className="accent-brand-600" /> Available for new leads</label>
              </ActionForm>
            </Card>
          );
        })}
      </div>
    </>
  );
}
