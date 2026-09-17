import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { StatusBadge } from "@/components/app/status-badge";
import { DataTable, Td } from "@/components/app/table";
import { Badge, Notice } from "@/components/ui/primitives";
import { requireSection } from "@/lib/auth";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "API management" };

/** Reports whether credentials exist without ever reading their values out (PRD §8.5). */
function credentialsConfigured(prefix: string | null) {
  if (!prefix) return null;
  return Object.keys(process.env).some((k) => k.startsWith(`${prefix}_`) && Boolean(process.env[k]));
}

export default async function SuppliersPage() {
  const viewer = await requireSection("suppliers");
  const supabase = await createClient();
  const { data } = await supabase.from("supplier_configs").select("*").order("product").order("priority", { ascending: false });

  return (
    <>
      <PageHeader title="API management" description="Supplier integrations for flights, hotels and payments." />
      <Notice className="mb-6">
        Credentials are stored only as server environment variables (Vercel/Netlify project settings) and are never shown here.
        {viewer.role !== "super_admin" && " Only Super Admins can change supplier configuration."}
      </Notice>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 text-sm"><p className="text-muted">Active flight provider</p><p className="mt-1 font-semibold">{env.flightProvider}</p></div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm"><p className="text-muted">Active hotel provider</p><p className="mt-1 font-semibold">{env.hotelProvider}</p></div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm"><p className="text-muted">Payment gateway</p><p className="mt-1 font-semibold">{process.env.PAYMENT_GATEWAY ?? "mock"}</p></div>
      </div>
      <DataTable head={["Product", "Provider", "Environment", "Status", "Priority", "Credentials", "Settings"]}>
        {(data ?? []).map((s) => {
          const creds = s.provider === "mock" ? null : credentialsConfigured(s.credentials_env_prefix);
          return (
            <tr key={s.id}>
              <Td className="capitalize">{s.product}</Td>
              <Td className="font-medium">{s.provider}</Td>
              <Td><Badge tone={s.environment === "production" ? "success" : "warning"}>{s.environment}</Badge></Td>
              <Td><StatusBadge status={s.is_active ? "confirmed" : "cancelled"} /></Td>
              <Td>{s.priority}</Td>
              <Td className="text-xs">{s.provider === "mock" ? "Not required" : creds ? <Badge tone="success">Configured</Badge> : <Badge tone="danger">Missing</Badge>}</Td>
              <Td className="max-w-xs text-xs text-muted"><code>{JSON.stringify(s.settings)}</code></Td>
            </tr>
          );
        })}
        {!data?.length && <tr><Td className="text-muted">No suppliers configured.</Td></tr>}
      </DataTable>
    </>
  );
}
