import type { Metadata } from "next";
import { PageHeader } from "@/components/crm/blocks";
import { LeadForm } from "@/components/crm/lead-form";
import { requireCrm } from "@/lib/crm/auth";
import { leadFormOptions } from "../form-options";

export const metadata: Metadata = { title: "New lead" };

export default async function NewLeadPage() {
  const viewer = await requireCrm("leads.create");
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New lead" description="Phone and email are checked against existing leads to prevent duplicates." back={{ href: "/crm/leads", label: "Leads" }} />
      <LeadForm mode="create" options={await leadFormOptions(viewer)} />
    </div>
  );
}
