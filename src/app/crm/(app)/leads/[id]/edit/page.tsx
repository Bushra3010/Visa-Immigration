import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/crm/blocks";
import { LeadForm } from "@/components/crm/lead-form";
import { requireCrm } from "@/lib/crm/auth";
import { splitIst } from "@/lib/crm/dates";
import { createClient } from "@/lib/supabase/server";
import { leadFormOptions } from "../../form-options";

export const metadata: Metadata = { title: "Edit lead" };

export default async function EditLeadPage({ params }: PageProps<"/crm/leads/[id]/edit">) {
  const viewer = await requireCrm("leads.edit");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();
  const fu = splitIst(lead.next_follow_up_at);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={`Edit ${lead.full_name}`} description={lead.code} back={{ href: `/crm/leads/${id}`, label: "Back to lead" }} />
      <LeadForm mode="edit" options={await leadFormOptions(viewer)} values={{ ...lead, follow_up_date: fu.date, follow_up_time: fu.time }} />
    </div>
  );
}
