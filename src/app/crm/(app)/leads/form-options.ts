import "server-only";
import { can, type CrmViewer } from "@/lib/crm/auth";
import { assignableStaff, getCrmConfig } from "@/lib/crm/config";
import type { LeadFormOptions } from "@/components/crm/lead-form";

export async function leadFormOptions(viewer: CrmViewer): Promise<LeadFormOptions> {
  const config = await getCrmConfig();
  const opts = (kind: "lead_source" | "visa_category" | "destination_country") => config.options[kind].filter((o) => o.is_active).map((o) => ({ value: o.key, label: o.label }));
  return {
    sources: opts("lead_source"),
    visas: opts("visa_category"),
    countries: opts("destination_country"),
    staff: assignableStaff(config).map((s) => ({ value: s.id, label: `${s.full_name ?? s.email}${s.role_name ? ` — ${s.role_name}` : ""}` })),
    customFields: config.customFields.filter((f) => f.entity === "lead"),
    canAssign: can(viewer, "leads.assign") || can(viewer, "leads.reassign"),
    viewerId: viewer.id,
  };
}
