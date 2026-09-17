import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { COUNTRY_BY_SLUG } from "@/lib/content/countries";
import { SERVICE_BY_SLUG } from "@/lib/content/visa-services";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  await requireViewer(); // also stops DB queries when not signed in / not configured
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("code, destination_country, visa_service_slug, status, next_action, updated_at, counsellor:profiles!applications_counsellor_id_fkey(full_name)")
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader title="My applications" />
      {data?.length ? (
        <DataTable head={["Application ID", "Destination", "Visa", "Counsellor", "Status", "Next action", "Updated"]}>
          {data.map((a) => (
            <tr key={a.code}>
              <Td><Link href={`/dashboard/applications/${a.code}`} className="font-mono font-medium text-brand-600">{a.code}</Link></Td>
              <Td>{COUNTRY_BY_SLUG.get(a.destination_country)?.name ?? a.destination_country}</Td>
              <Td>{(a.visa_service_slug && SERVICE_BY_SLUG.get(a.visa_service_slug)?.title) ?? "—"}</Td>
              <Td>{(a.counsellor as unknown as { full_name: string } | null)?.full_name ?? "Being assigned"}</Td>
              <Td><StatusBadge status={a.status} /></Td>
              <Td className="max-w-56 text-ink-soft">{a.next_action ?? "—"}</Td>
              <Td className="whitespace-nowrap text-muted">{formatDate(a.updated_at)}</Td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <EmptyState
          title="No applications yet"
          description="Once your counsellor opens an application for you, you'll be able to track it here."
          action={<Link href="/eligibility" className={buttonClass("accent", "sm")}>Check eligibility</Link>}
        />
      )}
    </>
  );
}
