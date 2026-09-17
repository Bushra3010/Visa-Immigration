import type { Metadata } from "next";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { Input, Select } from "@/components/ui/fields";
import { updateConsultation } from "@/lib/admin/actions";
import { requireSection } from "@/lib/auth";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize, toBusinessInput } from "@/lib/utils";

export const metadata: Metadata = { title: "Consultations" };

export default async function AdminConsultationsPage() {
  await requireSection("consultations");
  const supabase = await createClient();
  const { data } = await supabase
    .from("consultations")
    .select("id, code, full_name, email, mobile, destination_country, visa_type, preferred_at, consultation_type, status, notes, counsellor:profiles!consultations_counsellor_id_fkey(full_name)")
    .order("preferred_at", { ascending: true })
    .limit(200);

  return (
    <>
      <PageHeader title="Consultations" />
      <DataTable head={["Customer", "When (IST)", "Type", "Destination / visa", "Counsellor", "Status", "Update"]}>
        {(data ?? []).map((c) => (
          <tr key={c.id}>
            <Td className="text-xs"><p className="font-medium text-sm">{c.full_name}</p>{c.mobile}<br />{c.email}<p className="font-mono text-muted">{c.code}</p></Td>
            <Td className="whitespace-nowrap text-xs">{formatDate(c.preferred_at, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</Td>
            <Td className="text-xs capitalize">{c.consultation_type}</Td>
            <Td className="text-xs">{COUNTRY_BY_SLUG.get(c.destination_country ?? "")?.name ?? "—"}<br />{c.visa_type ? humanize(c.visa_type) : ""}</Td>
            <Td className="text-xs">{(c.counsellor as unknown as { full_name: string } | null)?.full_name ?? "—"}</Td>
            <Td><StatusBadge status={c.status} /></Td>
            <Td>
              <ActionForm action={updateConsultation} submitLabel="Save" className="min-w-52">
                <input type="hidden" name="consultationId" value={c.id} />
                <Select name="status" defaultValue={c.status} aria-label="Status">{["requested", "confirmed", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</Select>
                <Input name="preferredAt" type="datetime-local" defaultValue={toBusinessInput(c.preferred_at)} aria-label="Reschedule" />
              </ActionForm>
            </Td>
          </tr>
        ))}
        {!data?.length && <tr><Td className="text-muted">No consultations.</Td></tr>}
      </DataTable>
    </>
  );
}
