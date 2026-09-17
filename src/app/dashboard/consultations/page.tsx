import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, humanize } from "@/lib/utils";

export const metadata: Metadata = { title: "Consultations" };

export default async function ConsultationsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase.from("consultations").select("code, preferred_at, consultation_type, destination_country, visa_type, status").order("preferred_at", { ascending: false });
  return (
    <>
      <PageHeader title="Consultations" actions={<Link href="/consultation" className={buttonClass("accent", "sm")}>Book consultation</Link>} />
      <DataTable head={["Reference", "Date & time", "Type", "Destination", "Visa", "Status"]}>
        {(data ?? []).map((c) => (
          <tr key={c.code}>
            <Td className="font-mono">{c.code}</Td>
            <Td>{formatDate(c.preferred_at, { dateStyle: "medium", timeStyle: "short" })}</Td>
            <Td className="capitalize">{c.consultation_type}</Td>
            <Td>{COUNTRY_BY_SLUG.get(c.destination_country ?? "")?.name ?? "—"}</Td>
            <Td>{c.visa_type ? humanize(c.visa_type) : "—"}</Td>
            <Td><StatusBadge status={c.status} /></Td>
          </tr>
        ))}
        {!data?.length && <tr><Td className="text-muted">No consultations yet.</Td></tr>}
      </DataTable>
    </>
  );
}
