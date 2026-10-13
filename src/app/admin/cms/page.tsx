import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ActionForm } from "@/components/app/action-form";
import { PageHeader } from "@/components/app/app-shell";
import { DataTable, Td } from "@/components/app/table";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/primitives";
import { importBundledContent } from "@/lib/admin/cms-actions";
import { requireSection } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Content (CMS)" };

const PublishBadge = ({ live }: { live: boolean }) => (live ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>);

export default async function CmsPage({ searchParams }: PageProps<"/admin/cms">) {
  await requireSection("cms");
  const { deleted } = await searchParams;
  const supabase = await createClient();
  const [{ data: countries }, { data: services }, { data: categories }] = await Promise.all([
    supabase.from("countries").select("id, slug, name, region, content, is_published, sort_order, visa_services(count)").order("sort_order").order("name"),
    supabase.from("visa_services").select("id, slug, title, is_published, updated_at, country:countries(name), category:visa_categories(name)").order("sort_order").order("title"),
    supabase.from("visa_categories").select("id, name, is_published").order("sort_order"),
  ]);
  const needsImport = (services ?? []).length === 0 || (countries ?? []).some((c) => Object.keys(c.content ?? {}).length === 0);

  return (
    <>
      <PageHeader
        title="Content (CMS)"
        description="Country pages, visa service pages and visa categories. Published changes go live on the website immediately."
        actions={<>
          <ButtonLink href="/admin/cms/countries/new" size="sm" variant="secondary"><Plus className="size-4" /> Country</ButtonLink>
          <ButtonLink href="/admin/cms/services/new" size="sm"><Plus className="size-4" /> Visa page</ButtonLink>
        </>}
      />
      {typeof deleted === "string" && <Notice tone="success" className="mb-6">The {deleted === "service" ? "visa page" : deleted} was deleted.</Notice>}
      {needsImport && (
        <Card className="mb-8 border-accent-500/30 bg-accent-50 p-5">
          <h2 className="font-semibold">Import the current website copy</h2>
          <p className="mb-3 mt-1 text-sm text-ink-soft">
            Some pages still use the bundled placeholder copy. Import it to edit it here. Only empty pages are filled; nothing you have already edited is overwritten.
          </p>
          <ActionForm action={importBundledContent} submitLabel="Import placeholder content" />
        </Card>
      )}

      <h2 className="mb-3 font-semibold">Countries ({countries?.length ?? 0})</h2>
      <DataTable head={["Country", "URL", "Region", "Visa pages", "Status", ""]} className="mb-8">
        {(countries ?? []).map((c) => (
          <tr key={c.id}>
            <Td><Link href={`/admin/cms/countries/${c.slug}`} className="font-medium hover:text-brand-600">{c.name}</Link></Td>
            <Td><Link className="text-brand-600" href={`/countries/${c.slug}`} target="_blank">/countries/{c.slug}</Link></Td>
            <Td>{c.region ?? "—"}</Td>
            <Td>{(c.visa_services as unknown as { count: number }[])[0]?.count ?? 0}</Td>
            <Td><PublishBadge live={c.is_published} /></Td>
            <Td className="text-right"><Link href={`/admin/cms/countries/${c.slug}`} className="text-sm text-brand-600">Edit</Link></Td>
          </tr>
        ))}
      </DataTable>

      <h2 className="mb-3 font-semibold">Visa service pages ({services?.length ?? 0})</h2>
      <DataTable head={["Service", "URL", "Country", "Category", "Status", ""]} className="mb-8">
        {(services ?? []).map((s) => (
          <tr key={s.id}>
            <Td><Link href={`/admin/cms/services/${s.slug}`} className="font-medium hover:text-brand-600">{s.title}</Link></Td>
            <Td><Link className="text-brand-600" href={`/visa/${s.slug}`} target="_blank">/visa/{s.slug}</Link></Td>
            <Td>{(s.country as unknown as { name: string } | null)?.name}</Td>
            <Td>{(s.category as unknown as { name: string } | null)?.name}</Td>
            <Td><PublishBadge live={s.is_published} /></Td>
            <Td className="text-right"><Link href={`/admin/cms/services/${s.slug}`} className="text-sm text-brand-600">Edit</Link></Td>
          </tr>
        ))}
      </DataTable>

      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-semibold">Visa categories ({categories?.length ?? 0})</h2>
        <Link href="/admin/cms/categories" className="text-sm text-brand-600">Manage categories →</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {(categories ?? []).map((c) => <Badge key={c.id} tone={c.is_published ? "brand" : "neutral"}>{c.name}{!c.is_published && " (draft)"}</Badge>)}
      </div>
    </>
  );
}
